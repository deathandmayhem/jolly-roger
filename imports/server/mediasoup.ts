import { promises as dns } from 'dns';
import { networkInterfaces } from 'os';
import { Meteor } from 'meteor/meteor';
import { Address6 } from 'ip-address';
import { createWorker, types } from 'mediasoup';
import { AudioLevelObserver } from 'mediasoup/node/lib/AudioLevelObserver';
import Ansible from '../Ansible';
import Flags from '../Flags';
import { ACTIVITY_GRANULARITY } from '../lib/config/activityTracking';
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from '../lib/config/webrtc';
import CallHistories from '../lib/models/mediasoup/CallHistories';
import ConnectAcks from '../lib/models/mediasoup/ConnectAcks';
import ConnectRequests from '../lib/models/mediasoup/ConnectRequests';
import ConsumerAcks from '../lib/models/mediasoup/ConsumerAcks';
import Consumers from '../lib/models/mediasoup/Consumers';
import Peers from '../lib/models/mediasoup/Peers';
import ProducerClients from '../lib/models/mediasoup/ProducerClients';
import ProducerServers from '../lib/models/mediasoup/ProducerServers';
import Rooms from '../lib/models/mediasoup/Rooms';
import Routers from '../lib/models/mediasoup/Routers';
import TransportRequests from '../lib/models/mediasoup/TransportRequests';
import TransportStates from '../lib/models/mediasoup/TransportStates';
import Transports from '../lib/models/mediasoup/Transports';
import roundedTime from '../lib/roundedTime';
import { ConnectRequestType } from '../lib/schemas/mediasoup/ConnectRequest';
import { ConsumerAckType } from '../lib/schemas/mediasoup/ConsumerAck';
import { ProducerClientType } from '../lib/schemas/mediasoup/ProducerClient';
import { RoomType } from '../lib/schemas/mediasoup/Room';
import { TransportRequestType } from '../lib/schemas/mediasoup/TransportRequest';
import throttle from '../lib/throttle';
import { registerPeriodicCleanupHook, serverId } from './garbage-collection';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import RecentActivities from './models/RecentActivities';
import onExit from './onExit';

const mediaCodecs: types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
];

type ConsumerAppData = {
  call: string;
  peer: string;
  transportRequest: string;
  transportId: string;
  producerPeer: string;
  createdBy: string;
};

type ProducerAppData = {
  call: string;
  peer: string;
  transport: string;
  trackId: string;
  producerClient: string;
  createdBy: string;
};

type TransportAppData = {
  transportRequest: string;
  call: string;
  peer: string;
  createdBy: string;
  direction: 'send' | 'recv';
};

type AudioLevelObserverAppData = {
  hunt: string;
  call: string;
};

type RouterAppData = {
  hunt: string;
  call: string;
  createdBy: string;
};

class SFU {
  public ips: types.TransportListenIp[];

  public worker: types.Worker;

  // Keyed to call id
  public routers: Map<string, types.Router> = new Map();

  // Keyed to call id
  public observers: Map<string, types.AudioLevelObserver> = new Map();

  // Keyed to "${transportRequest}:${direction}"
  public transports: Map<string, types.WebRtcTransport> = new Map();

  // Keyed to producerClient id
  public producers: Map<string, types.Producer> = new Map();

  // Keyed to "${transportRequest}:${producerId}" (mediasoup producer UUID)
  public consumers: Map<string, types.Consumer> = new Map();

  public roomToRouter: Map<string, Promise<types.Router>> = new Map();

  public transportRequestToTransports: Map<string, Promise<types.Transport[]>> = new Map();

  public producerClientToProducer: Map<string, Promise<types.Producer>> = new Map();

  public peerToRtpCapabilities: Map<string, types.RtpCapabilities> = new Map();

  public peersHandle: Meteor.LiveQueryHandle;

  public localRoomsHandle: Meteor.LiveQueryHandle;

  public transportRequestsHandle: Meteor.LiveQueryHandle;

  public connectRequestsHandle: Meteor.LiveQueryHandle;

  public producerClientsHandle: Meteor.LiveQueryHandle;

  public consumerAcksHandle: Meteor.LiveQueryHandle;

  private constructor(ips: types.TransportListenIp[], worker: types.Worker) {
    this.ips = ips;
    this.worker = worker;

    // Don't use mediasoup.observer because it's too hard to unwind.
    this.onWorkerCreated(this.worker);

    this.peersHandle = Peers.find({}).observeChanges({
      // Use this as an opportunity to cleanup data created as part of the
      // transport negotiation
      removed: (id) => this.peerRemoved(id),
    });

    this.localRoomsHandle = Rooms.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        void this.roomCreated({ _id: id, ...fields } as RoomType);
      },
      removed: (id) => {
        void this.roomRemoved(id);
      },
    });

    this.transportRequestsHandle = TransportRequests
      .find({ routedServer: serverId })
      .observeChanges({
        added: (id, fields) => {
          void this.transportRequestCreated({ _id: id, ...fields } as TransportRequestType);
        },
        removed: (id) => {
          void this.transportRequestRemoved(id);
        },
      });

    this.connectRequestsHandle = ConnectRequests.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        void this.connectRequestCreated({ _id: id, ...fields } as ConnectRequestType);
      },
      // nothing to do when this is removed
    });

    this.producerClientsHandle = ProducerClients.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        void this.producerClientCreated({ _id: id, ...fields } as ProducerClientType);
      },
      changed: (id, fields) => {
        void this.producerClientChanged(id, fields);
      },
      removed: (id) => {
        void this.producerClientRemoved(id);
      },
    });

    this.consumerAcksHandle = ConsumerAcks.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        void this.consumerAckCreated({ _id: id, ...fields } as ConsumerAckType);
      },
      // nothing to do when removed
    });
  }

  static async create(ips: types.TransportListenIp[]) {
    process.env.DEBUG = 'mediasoup:WARN:* mediasoup:ERROR:*';
    const worker = await createWorker();
    return new SFU(ips, worker);
  }

  close() {
    // Since these are all initiated in the constructor, optional chaining here
    // shouldn't be required, but because this can be called in a signal
    // handler, it can be called in the middle of the constructor
    this.consumerAcksHandle?.stop();
    this.producerClientsHandle?.stop();
    this.connectRequestsHandle?.stop();
    this.transportRequestsHandle?.stop();
    this.localRoomsHandle?.stop();
    this.peersHandle?.stop();
    this.worker.close();

    // Make a best effort to clean up after ourselves
    ConsumerAcks.remove({ createdServer: serverId });
    Consumers.remove({ createdServer: serverId });

    ProducerServers.remove({ createdServer: serverId });
    ProducerClients.remove({ createdServer: serverId });

    ConnectAcks.remove({ createdServer: serverId });
    ConnectRequests.remove({ createdServer: serverId });

    TransportStates.remove({ createdServer: serverId });
    Transports.remove({ createdServer: serverId });
    TransportRequests.remove({ createdServer: serverId });

    Routers.remove({ createdServer: serverId });
  }

  async createConsumer(
    consumerTransportDirection: string,
    consumerTransport: types.Transport,
    producer: types.Producer,
  ) {
    if (consumerTransportDirection !== 'recv') {
      return;
    }

    const consumerTransportAppData = consumerTransport.appData as TransportAppData;
    const producerAppData = producer.appData as ProducerAppData;

    if (consumerTransportAppData.peer === producerAppData.peer) {
      return;
    }

    if (consumerTransportAppData.call !== producerAppData.call) {
      return;
    }

    const router = this.routers.get(producerAppData.call);
    if (!router) {
      return;
    }

    const capabilities = this.peerToRtpCapabilities.get(consumerTransportAppData.peer);
    if (!capabilities) {
      return;
    }

    if (!router.canConsume({ producerId: producer.id, rtpCapabilities: capabilities })) {
      Ansible.warn('Consumer can not consume from peer (this should not happen)', {
        producerPeer: producerAppData.peer,
        consumerPeer: consumerTransportAppData.peer,
        capabilities: JSON.stringify(capabilities),
      });
      return;
    }

    try {
      const appData: ConsumerAppData = {
        call: consumerTransportAppData.call,
        peer: consumerTransportAppData.peer,
        transportRequest: consumerTransportAppData.transportRequest,
        transportId: consumerTransport.id,
        producerPeer: producerAppData.peer,
        createdBy: consumerTransportAppData.createdBy,
      };
      await consumerTransport.consume({
        producerId: producer.id,
        rtpCapabilities: capabilities,
        // Mediasoup docs recommend starting all consumers paused until the
        // client acknowledges that its setup
        paused: true,
        appData,
      });
    } catch (e) {
      Ansible.error('Error creating consumer', {
        call: producerAppData.call,
        peer: producerAppData.peer,
        transport: consumerTransport.id,
        producer: producer.id,
        error: (e instanceof Error ? e.message : e),
      });
    }
  }

  // Mediasoup callbacks
  //
  // Use the observer API to maintain our in-memory mappings and our database
  // state tracking of mediasoup state. Note that we setup any additional
  // callbacks _before_ we record state to the database so the callbacks are in
  // place before we block - the database operation should always be the last
  // thing we do
  //
  // Note that the mediasoup docs discourage using the observer API "by the
  // application itself," but their recommended object lifecycle tracking model
  // seems very hard to reason about exhaustively. E.g. to catch all the cases
  // when a consumer is closed, you need to listen for "transportclose" and
  // "producerclose", and if you call .close() yourself, no event is emitted.
  // Using the observer API makes the bookkeeping much more reliable

  onWorkerCreated(worker: types.Worker) {
    worker.observer.on('newrouter', Meteor.bindEnvironment(this.onRouterCreated.bind(this)));
  }

  onRouterCreated(router: types.Router) {
    router.observer.on('newtransport', Meteor.bindEnvironment(this.onTransportCreated.bind(this)));

    const routerAppData = router.appData as RouterAppData;

    router.observer.on('close', Meteor.bindEnvironment(() => {
      Ansible.info('Router was shut down', { call: routerAppData.call, router: router.id });
      this.routers.delete(routerAppData.call);
      Routers.remove({ routerId: router.id });
    }));
    router.observer.on('newrtpobserver', Meteor.bindEnvironment(this.onRtpObserverCreated.bind(this)));

    this.routers.set(routerAppData.call, router);
    const appData: AudioLevelObserverAppData = {
      hunt: routerAppData.hunt,
      call: routerAppData.call,
    };
    void router.createAudioLevelObserver({
      threshold: -50,
      interval: 100,
      appData,
    });
    Routers.insert({
      hunt: routerAppData.hunt,
      call: routerAppData.call,
      createdServer: serverId,
      routerId: router.id,
      rtpCapabilities: JSON.stringify(router.rtpCapabilities),
      createdBy: routerAppData.createdBy,
    });
  }

  onRtpObserverCreated(observer: types.RtpObserver) {
    if (!(observer instanceof AudioLevelObserver)) {
      return;
    }

    const observerAppData = observer.appData as AudioLevelObserverAppData;

    const lastWriteByUser = new Map<string, number>();
    const updateRecentActivity = Meteor.bindEnvironment(
      (volumes: types.AudioLevelObserverVolume[]) => {
        const users = new Set(volumes.map((v) => {
          const { producer } = v;
          const producerAppData = producer.appData as ProducerAppData;
          return producerAppData.createdBy;
        }));
        void [...users].reduce(async (p, user) => {
          await p;

          // Update the database at max once per second per user
          const lastWrite = lastWriteByUser.get(user) ?? 0;
          if (lastWrite < Date.now() - 1000) {
            lastWriteByUser.set(user, Date.now());
            await ignoringDuplicateKeyErrors(async () => {
              await RecentActivities.insertAsync({
                hunt: observerAppData.hunt,
                puzzle: observerAppData.call,
                user,
                ts: roundedTime(ACTIVITY_GRANULARITY),
                type: 'call',
              });
            });
          }
        }, Promise.resolve());
      }
    );

    const updateCallHistory = throttle(Meteor.bindEnvironment(() => {
      CallHistories.upsert({
        hunt: observerAppData.hunt,
        call: observerAppData.call,
      }, { $set: { lastActivity: new Date() } });
    }), RECENT_ACTIVITY_TIME_WINDOW_MS);

    observer.observer.on('close', () => {
      updateCallHistory.cancel();
      this.observers.delete(observerAppData.call);
    });

    observer.observer.on('volumes', (volumes) => {
      updateRecentActivity(volumes);
      updateCallHistory.attempt();
    });

    this.observers.set(observerAppData.call, observer);
  }

  onTransportCreated(transport: types.Transport) {
    transport.observer.on('newproducer', Meteor.bindEnvironment(this.onProducerCreated.bind(this)));
    transport.observer.on('newconsumer', Meteor.bindEnvironment(this.onConsumerCreated.bind(this)));

    const transportAppData = transport.appData as TransportAppData;

    transport.observer.on('close', Meteor.bindEnvironment(() => {
      this.transports.delete(`${transportAppData.transportRequest}:${transportAppData.direction}`);
      Transports.remove({ transportId: transport.id });
      TransportStates.remove({ transportId: transport.id });
    }));

    if (!(transport instanceof types.WebRtcTransport)) {
      Ansible.warn('Ignoring unexpected non-WebRTC transport', { call: transportAppData.call, peer: transportAppData.peer, transport: transport.id });
      return;
    }

    transport.observer.on('icestatechange', Meteor.bindEnvironment((iceState: types.IceState) => {
      TransportStates.upsert({
        createdServer: serverId,
        transportId: transport.id,
      }, {
        $set: {
          iceState,
          createdBy: transportAppData.createdBy,
        },
      });
    }));
    transport.observer.on('iceselectedtuplechange', Meteor.bindEnvironment((iceSelectedTuple?: types.TransportTuple) => {
      TransportStates.upsert({
        createdServer: serverId,
        transportId: transport.id,
      }, {
        $set: {
          iceSelectedTuple: iceSelectedTuple ? JSON.stringify(iceSelectedTuple) : undefined,
          createdBy: transportAppData.createdBy,
        },
      });
    }));
    transport.observer.on('dtlsstatechange', Meteor.bindEnvironment((dtlsState: types.DtlsState) => {
      TransportStates.upsert({
        createdServer: serverId,
        transportId: transport.id,
      }, {
        $set: {
          dtlsState,
          createdBy: transportAppData.createdBy,
        },
      });
    }));

    // This casts a wide net, but `createConsumer` will filter it down
    this.producers.forEach((producer) => {
      void this.createConsumer(transportAppData.direction, transport, producer);
    });

    this.transports.set(`${transportAppData.transportRequest}:${transportAppData.direction}`, transport);
    Transports.insert({
      call: transportAppData.call,
      createdServer: serverId,
      peer: transportAppData.peer,
      transportRequest: transportAppData.transportRequest,
      direction: transportAppData.direction,
      transportId: transport.id,
      iceParameters: JSON.stringify(transport.iceParameters),
      iceCandidates: JSON.stringify(transport.iceCandidates),
      dtlsParameters: JSON.stringify(transport.dtlsParameters),
      createdBy: transportAppData.createdBy,
    });
  }

  onProducerCreated(producer: types.Producer) {
    const producerAppData = producer.appData as ProducerAppData;
    producer.observer.on('close', Meteor.bindEnvironment(() => {
      this.producers.delete(producerAppData.producerClient);
      ProducerServers.remove({ producerId: producer.id });
    }));

    // Create consumers for other existing transports (this is way more
    // transports than we actually want to use, but `createConsumer` will filter
    // it down)
    this.transports.forEach((transport, key) => {
      void this.createConsumer(key.split(':')[1]!, transport, producer);
    });

    const observer = this.observers.get(producerAppData.call);
    if (observer) {
      void observer.addProducer({ producerId: producer.id });
    }

    this.producers.set(producerAppData.producerClient, producer);
    ProducerServers.insert({
      createdServer: serverId,
      call: producerAppData.call,
      peer: producerAppData.peer,
      transport: producerAppData.transport,
      producerClient: producerAppData.producerClient,
      trackId: producerAppData.trackId,
      producerId: producer.id,
      createdBy: producerAppData.createdBy,
    });
  }

  onConsumerCreated(consumer: types.Consumer) {
    const consumerAppData = consumer.appData as ConsumerAppData;
    consumer.observer.on('close', Meteor.bindEnvironment(() => {
      this.consumers.delete(`${consumerAppData.transportRequest}:${consumer.producerId}`);
      Consumers.remove({ consumerId: consumer.id });
    }));

    consumer.observer.on('pause', Meteor.bindEnvironment(() => {
      Consumers.update({ consumerId: consumer.id }, { $set: { paused: true } });
    }));
    consumer.observer.on('resume', Meteor.bindEnvironment(() => {
      Consumers.update({ consumerId: consumer.id }, { $set: { paused: false } });
    }));

    this.consumers.set(`${consumerAppData.transportRequest}:${consumer.producerId}`, consumer);
    Consumers.insert({
      createdServer: serverId,
      call: consumerAppData.call,
      peer: consumerAppData.peer,
      transportRequest: consumerAppData.transportRequest,
      transportId: consumerAppData.transportId,
      producerPeer: consumerAppData.producerPeer,
      consumerId: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: JSON.stringify(consumer.rtpParameters),
      paused: consumer.paused,
      createdBy: consumerAppData.createdBy,
    });
  }

  // Mongo callbacks

  peerRemoved(id: string) {
    this.peerToRtpCapabilities.delete(id);
  }

  async roomCreated(room: RoomType) {
    Ansible.info('Creating router', { call: room.call });
    const appData: RouterAppData = {
      hunt: room.hunt,
      call: room.call,
      createdBy: room.createdBy,
    };
    const router = this.worker.createRouter({
      mediaCodecs,
      appData,
    });
    this.roomToRouter.set(room._id, router);

    try {
      await router;
    } catch (e) {
      Ansible.error('Error creating router', { call: room.call, error: (e instanceof Error ? e.message : e) });
    }
  }

  async roomRemoved(id: string) {
    const router = this.roomToRouter.get(id);
    if (!router) {
      return;
    }

    this.roomToRouter.delete(id);
    (await router).close();
  }

  async transportRequestCreated(transportRequest: TransportRequestType) {
    const router = this.routers.get(transportRequest.call);
    if (!router) {
      Ansible.warn('No router for transport request', { call: transportRequest.call });
      return;
    }

    const directions: ('send' | 'recv')[] = ['send', 'recv'];
    const transports = Promise.all(directions.map((direction) => {
      const appData: TransportAppData = {
        transportRequest: transportRequest._id,
        call: transportRequest.call,
        peer: transportRequest.peer,
        createdBy: transportRequest.createdBy,
        direction,
      };
      return router.createWebRtcTransport({
        listenIps: this.ips,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        appData,
      });
    }));
    this.transportRequestToTransports.set(transportRequest._id, transports);
    this.peerToRtpCapabilities.set(
      transportRequest.peer,
      JSON.parse(transportRequest.rtpCapabilities),
    );

    try {
      await transports;
    } catch (e) {
      Ansible.error('Error creating transport', { transport_request: transportRequest._id, error: (e instanceof Error ? e.message : e) });
    }
  }

  async transportRequestRemoved(id: string) {
    const transports = this.transportRequestToTransports.get(id);
    if (!transports) {
      return;
    }

    this.transportRequestToTransports.delete(id);
    (await transports).map((transport) => transport.close());
  }

  async connectRequestCreated(connectRequest: ConnectRequestType) {
    const transport = this.transports.get(`${connectRequest.transportRequest}:${connectRequest.direction}`);
    if (!transport) {
      Ansible.warn('No transport for connect request', { call: connectRequest.call, peer: connectRequest.peer, direction: connectRequest.direction });
      return;
    }

    try {
      await transport.connect({ dtlsParameters: JSON.parse(connectRequest.dtlsParameters) });
      ConnectAcks.insert({
        call: connectRequest.call,
        createdServer: serverId,
        peer: connectRequest.peer,
        transportRequest: connectRequest.transportRequest,
        direction: connectRequest.direction,
        transport: connectRequest.transport,
        createdBy: connectRequest.createdBy,
      });
    } catch (e) {
      Ansible.error('Error connecting transport', { transport: transport.id, error: (e instanceof Error ? e.message : e) });
    }
  }

  async producerClientCreated(producer: ProducerClientType) {
    const transport = this.transports.get(`${producer.transportRequest}:send`);
    if (!transport) {
      Ansible.warn('No transport for producer client', { call: producer.call, peer: producer.peer, producer: producer._id });
      return;
    }

    const appData: ProducerAppData = {
      call: producer.call,
      peer: producer.peer,
      transport: producer.transport,
      trackId: producer.trackId,
      producerClient: producer._id,
      createdBy: producer.createdBy,
    };
    const mediasoupProducer = transport.produce({
      kind: producer.kind,
      rtpParameters: JSON.parse(producer.rtpParameters),
      paused: producer.paused,
      appData,
    });
    this.producerClientToProducer.set(producer._id, mediasoupProducer);

    try {
      await mediasoupProducer;
    } catch (e) {
      Ansible.error('Error creating producer', { producer: producer._id, error: (e instanceof Error ? e.message : e) });
    }
  }

  async producerClientChanged(id: string, fields: Partial<ProducerClientType>) {
    if (!Object.prototype.hasOwnProperty.call(fields, 'paused')) {
      return;
    }

    const producerPromise = this.producerClientToProducer.get(id);
    if (!producerPromise) {
      return;
    }

    const producer = await producerPromise;
    if (fields.paused) {
      await producer.pause();
    } else {
      await producer.resume();
    }
  }

  async producerClientRemoved(id: string) {
    const producer = this.producerClientToProducer.get(id);
    if (!producer) {
      return;
    }

    this.producerClientToProducer.delete(id);
    (await producer).close();
  }

  async consumerAckCreated(consumerAck: ConsumerAckType) {
    const consumer = this.consumers.get(`${consumerAck.transportRequest}:${consumerAck.producerId}`);
    if (!consumer) {
      Ansible.warn('No consumer for consumer ack', { peer: consumerAck.peer, producer: consumerAck.producerId });
      return;
    }

    await consumer.resume();
  }
}

type IPSource = [
  resolver: string,
  lookup: string,
  rrtype: 'A' | 'TXT' | 'AAAA',
]

const IPSources: { v4: IPSource[], v6: IPSource[] } = {
  v4: [
    ['resolver1.opendns.com', 'myip.opendns.com', 'A'],
    ['ns1.google.com', 'o-o.myaddr.l.google.com', 'TXT'],
    ['ns1-1.akamaitech.net', 'whoami.akamai.net', 'A'],
  ],
  v6: [
    ['resolver1.opendns.com', 'myip.opendns.com', 'AAAA'],
    ['ns1.google.com', 'o-o.myaddr.l.google.com', 'TXT'],
  ],
};

const lookupIPSource = async (ipv: 'v4' | 'v6', [resolver, hostname, rrtype]: IPSource) => {
  const resolverAddress = await (ipv === 'v4' ? dns.resolve4(resolver) : dns.resolve6(resolver));
  const r = new dns.Resolver();
  r.setServers(resolverAddress);
  switch (rrtype) {
    case 'A':
      return r.resolve4(hostname);
    case 'TXT':
      return (await r.resolveTxt(hostname)).flat();
    case 'AAAA':
      return r.resolve6(hostname);
    default:
      throw new Error(`Unknown rrtype: ${rrtype}`);
  }
};

const lookupIPSources = async (ipv: 'v4' | 'v6') => {
  const sources = IPSources[ipv];
  const resolutions = Promise.all(sources.map(async (source) => {
    try {
      return await lookupIPSource(ipv, source);
    } catch (e) {
      return undefined;
    }
  }));
  const ips = (await resolutions).filter((res): res is string[] => res !== undefined);
  // Get unique set of IPs
  return [...new Set(ips.flat())];
};

const getPublicIPAddresses = async (): Promise<types.TransportListenIp[]> => {
  const [ipv4, ipv6] = await Promise.all([lookupIPSources('v4'), lookupIPSources('v6')]);
  return [
    ipv4.map((a) => { return { ip: '0.0.0.0', announcedIp: a }; }),
    ipv6.map((a) => { return { ip: '::', announcedIp: a }; }),
  ].flat();
};

const getLocalIPAddresses = (): types.TransportListenIp[] => {
  return Object.values(networkInterfaces()).flatMap((addresses) => {
    if (!addresses) {
      return [];
    }
    const filtered = addresses.filter((address) => {
      if (address.family === 'IPv4') {
        return !address.internal;
      } else if (address.family === 'IPv6') {
        const parsed = new Address6(address.address);
        return !address.internal &&
          !parsed.isLoopback() &&
          !parsed.isLinkLocal() &&
          !parsed.isMulticast();
      }
      return false;
    });

    // For each of IPv4 and IPv6, pick the last filtered address. For IPv6 in
    // particular, modern OS's generate new addresses periodically, which can
    // cause this list to otherwise get quite long.
    const ipv4 = [...filtered].reverse().find((address) => address.family === 'IPv4');
    const ipv6 = [...filtered].reverse().find((address) => address.family === 'IPv6');
    return [ipv4?.address, ipv6?.address].filter<string>((v): v is string => Boolean(v));
  })
    .map((ip) => { return { ip }; });
};

registerPeriodicCleanupHook((deadServers) => {
  ConsumerAcks.remove({ createdServer: { $in: deadServers } });
  Consumers.remove({ createdServer: { $in: deadServers } });

  ProducerServers.remove({ createdServer: { $in: deadServers } });
  ProducerClients.remove({ createdServer: { $in: deadServers } });

  ConnectAcks.remove({ createdServer: { $in: deadServers } });
  ConnectRequests.remove({ createdServer: { $in: deadServers } });

  TransportStates.remove({ createdServer: { $in: deadServers } });
  Transports.remove({ createdServer: { $in: deadServers } });
  TransportRequests.remove({ createdServer: { $in: deadServers } });

  Routers.remove({ createdServer: { $in: deadServers } });
});

// A note: the current behavior of Meteor.startup is that it blocks the
// application from serving requests until all startup functions have returned.
// However, it is not async-aware, so it will start serving requests before the
// mediasoup daemon is initialized. Because we only interface with mediasoup via
// database records, this should be safe, as we will pick up any prematurely
// created records when the daemon is eventually initialized. (And if the
// behavior of Meteor.startup changes in the future, that should be OK too)
Meteor.startup(async () => {
  const ips = Meteor.isDevelopment ?
    getLocalIPAddresses() :
    await getPublicIPAddresses();
  Ansible.log('Discovered announceable IPs', { ips: ips.map((ip) => ip.announcedIp ?? ip.ip) });

  let sfu: SFU | undefined;
  const updateSFU = async (enable: boolean) => {
    const newSfu = enable ? await SFU.create(ips) : undefined;
    sfu?.close();
    sfu = newSfu;
  };
  // The logic here looks backwards because when a feature flag is on, calls are
  // disabled.
  const observer = Flags.observeChanges('disable.webrtc', (active) => {
    void updateSFU(!active);
  });

  onExit(Meteor.bindEnvironment(() => {
    observer.stop();
    sfu?.close();
  }));
});
