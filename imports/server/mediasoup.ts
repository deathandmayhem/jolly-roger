import { promises as dns } from 'dns';
import { networkInterfaces } from 'os';
import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import { _ } from 'meteor/underscore';
import { Address6 } from 'ip-address';
import { createWorker, types } from 'mediasoup';
import Ansible from '../ansible';
import FeatureFlags from '../lib/models/feature_flags';
import ConnectAcks from '../lib/models/mediasoup/connect_acks';
import ConnectRequests from '../lib/models/mediasoup/connect_requests';
import ConsumerAcks from '../lib/models/mediasoup/consumer_acks';
import Consumers from '../lib/models/mediasoup/consumers';
import Peers from '../lib/models/mediasoup/peers';
import ProducerClients from '../lib/models/mediasoup/producer_clients';
import ProducerServers from '../lib/models/mediasoup/producer_servers';
import Rooms from '../lib/models/mediasoup/rooms';
import Routers from '../lib/models/mediasoup/routers';
import TransportRequests from '../lib/models/mediasoup/transport_requests';
import TransportStates from '../lib/models/mediasoup/transport_states';
import Transports from '../lib/models/mediasoup/transports';
import { ConnectRequestType } from '../lib/schemas/mediasoup/connect_request';
import { ConsumerAckType } from '../lib/schemas/mediasoup/consumer_ack';
import { ProducerClientType } from '../lib/schemas/mediasoup/producer_client';
import { RoomType } from '../lib/schemas/mediasoup/room';
import { TransportRequestType } from '../lib/schemas/mediasoup/transport_request';
import { registerPeriodicCleanupHook, serverId } from './garbage-collection';
import onExit from './onExit';

const mediaCodecs: types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
];

class SFU {
  public ips: types.TransportListenIp[];

  public worker: types.Worker;

  // Keyed to call id
  public routers: Map<string, types.Router> = new Map();

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

  constructor(ips: types.TransportListenIp[]) {
    this.ips = ips;

    process.env.DEBUG = 'mediasoup:WARN:* mediasoup:ERROR:*';
    this.worker = MeteorPromise.await(createWorker());
    // Don't use mediasoup.observer because it's too hard to unwind.
    this.onWorkerCreated(this.worker);

    this.peersHandle = Peers.find({}).observeChanges({
      // Use this as an opportunity to cleanup data created as part of the
      // transport negotiation
      removed: (id) => this.peerRemoved(id),
    });

    this.localRoomsHandle = Rooms.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => this.roomCreated({ _id: id, ...fields } as RoomType),
      removed: (id) => this.roomRemoved(id),
    });

    this.transportRequestsHandle = TransportRequests
      .find({ routedServer: serverId })
      .observeChanges({
        added: (id, fields) => {
          this.transportRequestCreated({ _id: id, ...fields } as TransportRequestType);
        },
        removed: (id) => this.transportRequestRemoved(id),
      });

    this.connectRequestsHandle = ConnectRequests.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        this.connectRequestCreated({ _id: id, ...fields } as ConnectRequestType);
      // nothing to do when this is removed
      },
    });

    this.producerClientsHandle = ProducerClients.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        this.producerClientCreated({ _id: id, ...fields } as ProducerClientType);
      },
      changed: (id, fields) => {
        this.producerClientChanged(id, fields);
      },
      removed: (id) => this.producerClientRemoved(id),
    });

    this.consumerAcksHandle = ConsumerAcks.find({ routedServer: serverId }).observeChanges({
      added: (id, fields) => {
        this.consumerAckCreated({ _id: id, ...fields } as ConsumerAckType);
      },
      // nothing to do when removed
    });
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

    if (consumerTransport.appData.peer === producer.appData.peer) {
      return;
    }

    if (consumerTransport.appData.call !== producer.appData.call) {
      return;
    }

    const router = this.routers.get(producer.appData.call);
    if (!router) {
      return;
    }

    const capabilities = this.peerToRtpCapabilities.get(consumerTransport.appData.peer);
    if (!capabilities) {
      return;
    }

    if (!router.canConsume({ producerId: producer.id, rtpCapabilities: capabilities })) {
      Ansible.warn('Consumer can not consume from peer (this should not happen)', {
        producerPeer: producer.appData.peer,
        consumerPeer: consumerTransport.appData.peer,
        capabilities: JSON.stringify(capabilities),
      });
      return;
    }

    try {
      await consumerTransport.consume({
        producerId: producer.id,
        rtpCapabilities: capabilities,
        // Mediasoup docs recommend starting all consumers paused until the
        // client acknowledges that its setup
        paused: true,
        appData: {
          call: consumerTransport.appData.call,
          peer: consumerTransport.appData.peer,
          transportRequest: consumerTransport.appData.transportRequest,
          transportId: consumerTransport.id,
          producerPeer: producer.appData.peer,
          createdBy: consumerTransport.appData.createdBy,
        },
      });
    } catch (e) {
      Ansible.error('Error creating consumer', {
        call: producer.appData.call,
        peer: producer.appData.peer,
        transport: consumerTransport.id,
        producer: producer.id,
        error: e.message,
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

    router.observer.on('close', Meteor.bindEnvironment(() => {
      Ansible.info('Router was shut down', { call: router.appData.call, router: router.id });
      this.routers.delete(router.appData.call);
      Routers.remove({ routerId: router.id });
    }));

    this.routers.set(router.appData.call, router);
    Routers.insert({
      call: router.appData.call,
      createdServer: serverId,
      routerId: router.id,
      rtpCapabilities: JSON.stringify(router.rtpCapabilities),
      createdBy: router.appData.createdBy,
    });
  }

  onTransportCreated(transport: types.Transport) {
    transport.observer.on('newproducer', Meteor.bindEnvironment(this.onProducerCreated.bind(this)));
    transport.observer.on('newconsumer', Meteor.bindEnvironment(this.onConsumerCreated.bind(this)));

    transport.observer.on('close', Meteor.bindEnvironment(() => {
      this.transports.delete(`${transport.appData.transportRequest}:${transport.appData.direction}`);
      Transports.remove({ transportId: transport.id });
      TransportStates.remove({ transportId: transport.id });
    }));

    if (!(transport instanceof types.WebRtcTransport)) {
      Ansible.warn('Ignoring unexpected non-WebRTC transport', { call: transport.appData.call, peer: transport.appData.peer, transport: transport.id });
      return;
    }

    transport.observer.on('icestatechange', Meteor.bindEnvironment((iceState: types.IceState) => {
      TransportStates.upsert({
        createdServer: serverId,
        transportId: transport.id,
      }, {
        $set: {
          iceState,
          createdBy: transport.appData.createdBy,
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
          createdBy: transport.appData.createdBy,
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
          createdBy: transport.appData.createdBy,
        },
      });
    }));

    // This casts a wide net, but `createConsumer` will filter it down
    this.producers.forEach((producer) => {
      this.createConsumer(transport.appData.direction, transport, producer);
    });

    this.transports.set(`${transport.appData.transportRequest}:${transport.appData.direction}`, transport);
    Transports.insert({
      call: transport.appData.call,
      createdServer: serverId,
      peer: transport.appData.peer,
      transportRequest: transport.appData.transportRequest,
      direction: transport.appData.direction,
      transportId: transport.id,
      iceParameters: JSON.stringify(transport.iceParameters),
      iceCandidates: JSON.stringify(transport.iceCandidates),
      dtlsParameters: JSON.stringify(transport.dtlsParameters),
      createdBy: transport.appData.createdBy,
    });
  }

  onProducerCreated(producer: types.Producer) {
    producer.observer.on('close', Meteor.bindEnvironment(() => {
      this.producers.delete(producer.appData.producerClient);
      ProducerServers.remove({ producerId: producer.id });
    }));

    // Create consumers for other existing transports (this is way more
    // transports than we actually want to use, but `createConsumer` will filter
    // it down)
    this.transports.forEach((transport, key) => {
      this.createConsumer(key.split(':')[1], transport, producer);
    });

    this.producers.set(producer.appData.producerClient, producer);
    ProducerServers.insert({
      createdServer: serverId,
      call: producer.appData.call,
      peer: producer.appData.peer,
      transport: producer.appData.transport,
      producerClient: producer.appData.producerClient,
      trackId: producer.appData.trackId,
      producerId: producer.id,
      createdBy: producer.appData.createdBy,
    });
  }

  onConsumerCreated(consumer: types.Consumer) {
    consumer.observer.on('close', Meteor.bindEnvironment(() => {
      this.consumers.delete(`${consumer.appData.transportRequest}:${consumer.producerId}`);
      Consumers.remove({ consumerId: consumer.id });
    }));

    consumer.observer.on('pause', Meteor.bindEnvironment(() => {
      Consumers.update({ consumerId: consumer.id }, { $set: { paused: true } });
    }));
    consumer.observer.on('resume', Meteor.bindEnvironment(() => {
      Consumers.update({ consumerId: consumer.id }, { $set: { paused: false } });
    }));

    this.consumers.set(`${consumer.appData.transportRequest}:${consumer.producerId}`, consumer);
    Consumers.insert({
      createdServer: serverId,
      call: consumer.appData.call,
      peer: consumer.appData.peer,
      transportRequest: consumer.appData.transportRequest,
      transportId: consumer.appData.transportId,
      producerPeer: consumer.appData.producerPeer,
      consumerId: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: JSON.stringify(consumer.rtpParameters),
      paused: consumer.paused,
      createdBy: consumer.appData.createdBy,
    });
  }

  // Mongo callbacks

  peerRemoved(id: string) {
    this.peerToRtpCapabilities.delete(id);
  }

  async roomCreated(room: RoomType) {
    Ansible.info('Creating router', { call: room.call });
    const router = this.worker.createRouter({
      mediaCodecs,
      appData: {
        call: room.call,
        createdBy: room.createdBy,
      },
    });
    this.roomToRouter.set(room._id, router);

    try {
      await router;
    } catch (e) {
      Ansible.error('Error creating router', { call: room.call, error: e.message });
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

    const transports = Promise.all(['send', 'recv'].map((direction) => {
      return router.createWebRtcTransport({
        listenIps: this.ips,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        appData: {
          transportRequest: transportRequest._id,
          call: transportRequest.call,
          peer: transportRequest.peer,
          createdBy: transportRequest.createdBy,
          direction,
        },
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
      Ansible.error('Error creating transport', { transport_request: transportRequest._id, error: e.message });
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
      Ansible.error('Error connecting transport', { transport: transport.id, error: e.message });
    }
  }

  async producerClientCreated(producer: ProducerClientType) {
    const transport = this.transports.get(`${producer.transportRequest}:send`);
    if (!transport) {
      Ansible.warn('No transport for producer client', { call: producer.call, peer: producer.peer, producer: producer._id });
      return;
    }

    const mediasoupProducer = transport.produce({
      kind: producer.kind,
      rtpParameters: JSON.parse(producer.rtpParameters),
      paused: producer.paused,
      appData: {
        call: producer.call,
        peer: producer.peer,
        transport: producer.transport,
        trackId: producer.trackId,
        producerClient: producer._id,
        createdBy: producer.createdBy,
      },
    });
    this.producerClientToProducer.set(producer._id, mediasoupProducer);

    try {
      await mediasoupProducer;
    } catch (e) {
      Ansible.error('Error creating producer', { producer: producer._id, error: e.message });
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

Meteor.startup(() => {
  const ips = Meteor.isDevelopment ?
    getLocalIPAddresses() :
    MeteorPromise.await(getPublicIPAddresses());
  Ansible.log('Discovered announceable IPs', { ips: ips.map((ip) => ip.announcedIp || ip.ip) });

  let sfu: SFU | undefined;
  const updateSFU = (enable: boolean) => {
    if (enable === !!sfu) {
      return;
    }

    sfu?.close();
    sfu = enable ? new SFU(ips) : undefined;
  };
  // The logic here looks backwards because when a feature flag is on, calls are
  // disabled.
  const observer = FeatureFlags.find({ name: 'disable.webrtc' }).observe({
    added: (f) => updateSFU(f.type !== 'on'),
    changed: (f) => updateSFU(f.type !== 'on'),
    removed: () => updateSFU(true),
  });
  // If there's no feature flag record, then calls are enabled
  if (!FeatureFlags.findOne({ name: 'disable.webrtc' })) {
    updateSFU(true);
  }

  onExit(Meteor.bindEnvironment(() => {
    observer.stop();
    sfu?.close();
  }));
});
