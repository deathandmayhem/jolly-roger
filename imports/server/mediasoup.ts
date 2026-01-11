import crypto from "crypto";
import { promises as dns } from "dns";
import EventEmitter from "events";
import { networkInterfaces } from "os";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { Address6 } from "ip-address";
import { createWorker, type types } from "mediasoup";
import { AudioLevelObserverImpl } from "mediasoup/node/lib/AudioLevelObserver";
import Flags from "../Flags";
import Logger from "../Logger";
import { ACTIVITY_GRANULARITY } from "../lib/config/activityTracking";
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from "../lib/config/webrtc";
import type { ServerType } from "../lib/models/Servers";
import Servers from "../lib/models/Servers";
import CallHistories from "../lib/models/mediasoup/CallHistories";
import ConnectAcks from "../lib/models/mediasoup/ConnectAcks";
import ConnectRequests from "../lib/models/mediasoup/ConnectRequests";
import type { ConnectRequestType } from "../lib/models/mediasoup/ConnectRequests";
import ConsumerAcks from "../lib/models/mediasoup/ConsumerAcks";
import type { ConsumerAckType } from "../lib/models/mediasoup/ConsumerAcks";
import Consumers from "../lib/models/mediasoup/Consumers";
import MonitorConnectAcks from "../lib/models/mediasoup/MonitorConnectAcks";
import type { MonitorConnectAckType } from "../lib/models/mediasoup/MonitorConnectAcks";
import MonitorConnectRequests from "../lib/models/mediasoup/MonitorConnectRequests";
import type { MonitorConnectRequestType } from "../lib/models/mediasoup/MonitorConnectRequests";
import Peers from "../lib/models/mediasoup/Peers";
import ProducerClients from "../lib/models/mediasoup/ProducerClients";
import type { ProducerClientType } from "../lib/models/mediasoup/ProducerClients";
import ProducerServers from "../lib/models/mediasoup/ProducerServers";
import Rooms from "../lib/models/mediasoup/Rooms";
import type { RoomType } from "../lib/models/mediasoup/Rooms";
import Routers from "../lib/models/mediasoup/Routers";
import TransportRequests from "../lib/models/mediasoup/TransportRequests";
import type { TransportRequestType } from "../lib/models/mediasoup/TransportRequests";
import TransportStates from "../lib/models/mediasoup/TransportStates";
import Transports from "../lib/models/mediasoup/Transports";
import UserStatuses from "../lib/models/UserStatuses";
import roundedTime from "../lib/roundedTime";
import throttle from "../lib/throttle";
import {
  cleanupDeadServer,
  registerPeriodicCleanupHook,
  serverId,
} from "./garbage-collection";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import CallActivities from "./models/CallActivities";
import onExit from "./onExit";

const mediaCodecs: types.RouterRtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
];

const heartbeatFrequency = 100;
const heartbeatTimeout = heartbeatFrequency * 50;
const heartbeatInitialTimeout = heartbeatTimeout * 2;

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

type TransportAppData =
  | {
      type: "webrtc";
      transportRequest: string;
      call: string;
      peer: string;
      createdBy: string;
      direction: "send" | "recv";
    }
  | {
      type: "monitor-initiated";
      server: string;
    }
  | {
      type: "monitor-received";
      server: string;
      ip: string;
      port: number;
      srtpParameters?: types.SrtpParameters;
      producerId: string;
      producerSctpStreamParameters?: types.SctpStreamParameters;
      producerLabel: string;
      producerProtocol: string;
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

function generateTurnConfig() {
  const turnServer = process.env.TURN_SERVER;
  const turnSecret = process.env.TURN_SECRET;
  if (!turnServer || !turnSecret) {
    return undefined;
  }

  // Generate a username/credential that the TURN server will accept.

  // 3 days in seconds should be more than enough to get through hunt.
  // I sincerely doubt that any browser tab will be on a single call for that
  // long.
  const validityWindow = 3 * 24 * 60 * 60;
  const validUntil = Math.floor(Date.now() / 1000) + validityWindow;
  const nonce = Random.id();
  const username = `${validUntil}:${nonce}`;

  const hmac = crypto.createHmac("sha1", turnSecret);
  hmac.update(username);
  const credential = hmac.digest("base64");

  return {
    urls: turnServer,
    username,
    credential,
  };
}

class Watchdog extends EventEmitter {
  public timeout: number;

  public lastActivity: Date;

  public timeoutHandle!: number;

  constructor(timeout: number, initialTimeout: number = timeout) {
    super();
    this.timeout = timeout;
    this.lastActivity = new Date();
    this.timeoutHandle = Meteor.setTimeout(() => {
      this.emit("timeout");
    }, initialTimeout);
  }

  resetTimeout() {
    this.lastActivity = new Date();
    Meteor.clearTimeout(this.timeoutHandle);
    this.timeoutHandle = Meteor.setTimeout(() => {
      this.emit("timeout");
    }, this.timeout);
  }

  stop() {
    Meteor.clearTimeout(this.timeoutHandle);
  }
}

// This type, previously called `TransportListenIp`, is deprecated on the mediasoup side, but
// remains a reasonable internal representation of addresses, so we still store ips in SFU like this
// and adapt them to the new `TransportListenInfo` on demand where needed.
type ListenIp = {
  // listening IPv4 or IPv6 address
  ip: string;
  // external announced address (v4 or v6 or hostname)
  announcedIp?: string;
};

class SFU {
  public ips: [ListenIp, ...ListenIp[]];

  public worker: types.Worker;

  public monitorRouter: types.Router;

  public heartbeatDirectTransport: types.DirectTransport;

  public heartbeatDataProducer: types.DataProducer;

  // Keyed to server id
  public heartbeatWatchdogs: Map<string, Watchdog> = new Map();

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

  public transportRequestToTransports: Map<string, Promise<types.Transport[]>> =
    new Map();

  public producerClientToProducer: Map<string, Promise<types.Producer>> =
    new Map();

  public peerToRtpCapabilities: Map<string, types.RtpCapabilities> = new Map();

  public serverToMonitorTransport: Map<string, Promise<types.PipeTransport>> =
    new Map();

  public monitorConnectRequestToTransport: Map<
    string,
    Promise<types.PipeTransport>
  > = new Map();

  public peersHandle?: Meteor.LiveQueryHandle;

  public localRoomsHandle?: Meteor.LiveQueryHandle;

  public transportRequestsHandle?: Meteor.LiveQueryHandle;

  public connectRequestsHandle?: Meteor.LiveQueryHandle;

  public producerClientsHandle?: Meteor.LiveQueryHandle;

  public consumerAcksHandle?: Meteor.LiveQueryHandle;

  public serversHandle?: Meteor.LiveQueryHandle;

  public monitorConnectRequestsHandle?: Meteor.LiveQueryHandle;

  public monitorConnectAcksHandle?: Meteor.LiveQueryHandle;

  private constructor(
    ips: [ListenIp, ...ListenIp[]],
    worker: types.Worker,
    monitorRouter: types.Router,
    heartbeatDirectTransport: types.DirectTransport,
    heartbeatDataProducer: types.DataProducer,
  ) {
    this.ips = ips;
    this.worker = worker;
    this.monitorRouter = monitorRouter;
    this.heartbeatDirectTransport = heartbeatDirectTransport;
    this.heartbeatDataProducer = heartbeatDataProducer;

    // Don't use mediasoup.observer because it's too hard to unwind.
    this.onWorkerCreated(this.worker);
    this.onMonitorRouterCreated(this.monitorRouter);
  }

  async setupDBWatches() {
    this.peersHandle = await Peers.find({}).observeChangesAsync({
      // Use this as an opportunity to cleanup data created as part of the
      // transport negotiation
      removed: (id) => this.peerRemoved(id),
    });

    this.localRoomsHandle = await Rooms.find({
      routedServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.roomCreated({ _id: id, ...fields } as RoomType);
      },
      removed: (id) => {
        void this.roomRemoved(id);
      },
    });

    this.transportRequestsHandle = await TransportRequests.find({
      routedServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.transportRequestCreated({
          _id: id,
          ...fields,
        } as TransportRequestType);
      },
      removed: (id) => {
        void this.transportRequestRemoved(id);
      },
    });

    this.connectRequestsHandle = await ConnectRequests.find({
      routedServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.connectRequestCreated({
          _id: id,
          ...fields,
        } as ConnectRequestType);
      },
      // nothing to do when this is removed
    });

    this.producerClientsHandle = await ProducerClients.find({
      routedServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.producerClientCreated({
          _id: id,
          ...fields,
        } as ProducerClientType);
      },
      changed: (id, fields) => {
        void this.producerClientChanged(id, fields);
      },
      removed: (id) => {
        void this.producerClientRemoved(id);
      },
    });

    this.consumerAcksHandle = await ConsumerAcks.find({
      routedServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.consumerAckCreated({ _id: id, ...fields } as ConsumerAckType);
      },
      // nothing to do when removed
    });

    this.serversHandle = await Servers.find({
      _id: { $ne: serverId },
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.serverCreated({ _id: id, ...fields } as ServerType);
      },
      // don't care about changes
      removed: (id) => {
        void this.serverRemoved(id);
      },
    });

    this.monitorConnectRequestsHandle = await MonitorConnectRequests.find({
      receivingServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.monitorConnectRequestCreated({
          _id: id,
          ...fields,
        } as MonitorConnectRequestType);
      },
      removed: (id) => {
        void this.monitorConnectRequestRemoved(id);
      },
    });

    this.monitorConnectAcksHandle = await MonitorConnectAcks.find({
      initiatingServer: serverId,
    }).observeChangesAsync({
      added: (id, fields) => {
        void this.monitorConnectAckCreated({
          _id: id,
          ...fields,
        } as MonitorConnectAckType);
      },
    });
  }

  static async create(ips: [ListenIp, ...ListenIp[]]) {
    process.env.DEBUG = "mediasoup:WARN:* mediasoup:ERROR:*";
    const worker = await createWorker({
      rtcMinPort: 50000,
      rtcMaxPort: 65535,
    });
    const monitorRouter = await worker.createRouter({
      mediaCodecs,
      appData: {
        monitor: true,
      },
    });

    const heartbeatDirectTransport =
      await monitorRouter.createDirectTransport();
    const heartbeatDataProducer = await heartbeatDirectTransport.produceData({
      label: "heartbeat",
    });
    let heartbeatTimeoutHandle: number;
    const heartbeat = () => {
      heartbeatDataProducer.send(
        JSON.stringify({
          type: "heartbeat",
          serverId,
          time: Date.now(),
        }),
      );
      heartbeatTimeoutHandle = Meteor.setTimeout(
        heartbeat,
        heartbeatFrequency + (Math.random() - 0.5) * heartbeatFrequency * 0.1,
      );
    };
    heartbeat();
    heartbeatDataProducer.observer.on("close", () =>
      Meteor.clearTimeout(heartbeatTimeoutHandle),
    );

    const sfu = new SFU(
      ips,
      worker,
      monitorRouter,
      heartbeatDirectTransport,
      heartbeatDataProducer,
    );
    await sfu.setupDBWatches();
    return sfu;
  }

  async close() {
    // Note that this can be called in a signal handler, before the constructor
    // has completed.
    this.monitorConnectAcksHandle?.stop();
    this.monitorConnectRequestsHandle?.stop();
    this.serversHandle?.stop();
    this.consumerAcksHandle?.stop();
    this.producerClientsHandle?.stop();
    this.connectRequestsHandle?.stop();
    this.transportRequestsHandle?.stop();
    this.localRoomsHandle?.stop();
    this.peersHandle?.stop();
    this.worker.close();

    // Make a best effort to clean up after ourselves
    await MonitorConnectAcks.removeAsync({ receivingServer: serverId });
    await MonitorConnectRequests.removeAsync({ initiatingServer: serverId });

    await ConsumerAcks.removeAsync({ createdServer: serverId });
    await Consumers.removeAsync({ createdServer: serverId });

    await ProducerServers.removeAsync({ createdServer: serverId });
    await ProducerClients.removeAsync({ createdServer: serverId });

    await ConnectAcks.removeAsync({ createdServer: serverId });
    await ConnectRequests.removeAsync({ createdServer: serverId });

    await TransportStates.removeAsync({ createdServer: serverId });
    await Transports.removeAsync({ createdServer: serverId });
    await TransportRequests.removeAsync({ createdServer: serverId });

    await Routers.removeAsync({ createdServer: serverId });
  }

  async createConsumer(
    consumerTransportDirection: string,
    consumerTransport: types.Transport,
    producer: types.Producer,
  ) {
    if (consumerTransportDirection !== "recv") {
      return;
    }

    const consumerTransportAppData =
      consumerTransport.appData as TransportAppData;
    if (consumerTransportAppData.type !== "webrtc") {
      return;
    }

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

    const capabilities = this.peerToRtpCapabilities.get(
      consumerTransportAppData.peer,
    );
    if (!capabilities) {
      return;
    }

    if (
      !router.canConsume({
        producerId: producer.id,
        rtpCapabilities: capabilities,
      })
    ) {
      Logger.warn(
        "Consumer can not consume from peer (this should not happen)",
        {
          producerPeer: producerAppData.peer,
          consumerPeer: consumerTransportAppData.peer,
          capabilities: JSON.stringify(capabilities),
        },
      );
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
    } catch (error) {
      Logger.error("Error creating consumer", {
        error,
        call: producerAppData.call,
        peer: producerAppData.peer,
        transport: consumerTransport.id,
        producer: producer.id,
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
    worker.observer.on(
      "newrouter",
      Meteor.bindEnvironment(this.onRouterCreated.bind(this)),
    );
  }

  onMonitorRouterCreated(router: types.Router) {
    router.observer.on(
      "newtransport",
      Meteor.bindEnvironment(this.onMonitorTransportCreated.bind(this)),
    );
  }

  onRouterCreated(router: types.Router) {
    router.observer.on(
      "newtransport",
      Meteor.bindEnvironment(this.onTransportCreated.bind(this)),
    );

    const routerAppData = router.appData as RouterAppData;

    router.observer.on(
      "close",
      Meteor.bindEnvironment(() => {
        Logger.info("Router was shut down", {
          call: routerAppData.call,
          router: router.id,
        });
        this.routers.delete(routerAppData.call);
        void Routers.removeAsync({ routerId: router.id });
      }),
    );
    router.observer.on(
      "newrtpobserver",
      Meteor.bindEnvironment(this.onRtpObserverCreated.bind(this)),
    );

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
    void Routers.insertAsync({
      hunt: routerAppData.hunt,
      call: routerAppData.call,
      createdServer: serverId,
      routerId: router.id,
      rtpCapabilities: JSON.stringify(router.rtpCapabilities),
      createdBy: routerAppData.createdBy,
    });
  }

  onRtpObserverCreated(observer: types.RtpObserver) {
    if (!(observer instanceof AudioLevelObserverImpl)) {
      return;
    }

    const observerAppData = observer.appData as AudioLevelObserverAppData;

    const lastWriteByUser = new Map<string, number>();
    const updateCallActivity = Meteor.bindEnvironment(
      async (volumes: types.AudioLevelObserverVolume[]) => {
        const users = new Set(
          volumes.map((v) => {
            const { producer } = v;
            const producerAppData = producer.appData as ProducerAppData;
            return producerAppData.createdBy;
          }),
        );
        for (const user of users) {
          // Update the database at max once per second per user
          const lastWrite = lastWriteByUser.get(user) ?? 0;
          if (lastWrite < Date.now() - 1000) {
            lastWriteByUser.set(user, Date.now());
            await ignoringDuplicateKeyErrors(async () => {
              await CallActivities.insertAsync({
                hunt: observerAppData.hunt,
                call: observerAppData.call,
                user,
                ts: roundedTime(ACTIVITY_GRANULARITY),
              });

              // arguably this could/should go into a hook
              // but that seems like a bit too much overhead
              // for this feature?
              await UserStatuses.upsertAsync(
                {
                  hunt: observerAppData.hunt,
                  user: user,
                  type: "puzzleStatus",
                },
                {
                  $set: {
                    status: "call",
                    puzzle: observerAppData.call,
                  },
                },
              );
            });
          }
        }
      },
    );

    const updateCallHistory = throttle(
      Meteor.bindEnvironment(() => {
        void CallHistories.upsertAsync(
          {
            hunt: observerAppData.hunt,
            call: observerAppData.call,
          },
          { $set: { lastActivity: new Date() } },
        );
      }),
      RECENT_ACTIVITY_TIME_WINDOW_MS,
    );

    observer.observer.on("close", () => {
      updateCallHistory.cancel();
      this.observers.delete(observerAppData.call);
    });

    observer.observer.on("volumes", (volumes) => {
      void updateCallActivity(volumes);
      updateCallHistory.attempt();
    });

    this.observers.set(observerAppData.call, observer);
  }

  onTransportCreated(transport: types.Transport) {
    const transportAppData = transport.appData as TransportAppData;

    // We're not wiring onTransportCreated up to the monitor router, so this
    // shouldn't happen
    if (transportAppData.type !== "webrtc") {
      Logger.warn("Ignoring unexpected non-WebRTC transport", {
        error: new Error("Unexpected transport type"),
        type: transportAppData.type,
        server: transportAppData.server,
        transport: transport.id,
      });
      return;
    }

    transport.observer.on(
      "newproducer",
      Meteor.bindEnvironment(this.onProducerCreated.bind(this)),
    );
    transport.observer.on(
      "newconsumer",
      Meteor.bindEnvironment(this.onConsumerCreated.bind(this)),
    );

    transport.observer.on(
      "close",
      Meteor.bindEnvironment(() => {
        this.transports.delete(
          `${transportAppData.transportRequest}:${transportAppData.direction}`,
        );
        void Transports.removeAsync({ transportId: transport.id });
        void TransportStates.removeAsync({ transportId: transport.id });
      }),
    );

    if (!(transport.type === "webrtc")) {
      Logger.warn("Ignoring unexpected non-WebRTC transport", {
        call: transportAppData.call,
        peer: transportAppData.peer,
        transport: transport.id,
      });
      return;
    }

    const wtransport = transport as types.WebRtcTransport;

    wtransport.observer.on(
      "icestatechange",
      Meteor.bindEnvironment((iceState: types.IceState) => {
        void TransportStates.upsertAsync(
          {
            createdServer: serverId,
            transportId: transport.id,
          },
          {
            $set: {
              iceState,
              createdBy: transportAppData.createdBy,
            },
          },
        );
      }),
    );
    wtransport.observer.on(
      "iceselectedtuplechange",
      Meteor.bindEnvironment((iceSelectedTuple?: types.TransportTuple) => {
        void TransportStates.upsertAsync(
          {
            createdServer: serverId,
            transportId: transport.id,
          },
          {
            $set: {
              iceSelectedTuple: iceSelectedTuple
                ? JSON.stringify(iceSelectedTuple)
                : undefined,
              createdBy: transportAppData.createdBy,
            },
          },
        );
      }),
    );
    wtransport.observer.on(
      "dtlsstatechange",
      Meteor.bindEnvironment((dtlsState: types.DtlsState) => {
        void TransportStates.upsertAsync(
          {
            createdServer: serverId,
            transportId: transport.id,
          },
          {
            $set: {
              dtlsState,
              createdBy: transportAppData.createdBy,
            },
          },
        );
      }),
    );

    // This casts a wide net, but `createConsumer` will filter it down
    this.producers.forEach((producer) => {
      void this.createConsumer(transportAppData.direction, transport, producer);
    });

    this.transports.set(
      `${transportAppData.transportRequest}:${transportAppData.direction}`,
      wtransport,
    );
    void Transports.insertAsync({
      call: transportAppData.call,
      createdServer: serverId,
      peer: transportAppData.peer,
      transportRequest: transportAppData.transportRequest,
      direction: transportAppData.direction,
      transportId: transport.id,
      iceParameters: JSON.stringify(wtransport.iceParameters),
      iceCandidates: JSON.stringify(wtransport.iceCandidates),
      dtlsParameters: JSON.stringify(wtransport.dtlsParameters),
      createdBy: transportAppData.createdBy,
      turnConfig: generateTurnConfig(),
    });
  }

  onProducerCreated(producer: types.Producer) {
    const producerAppData = producer.appData as ProducerAppData;
    producer.observer.on(
      "close",
      Meteor.bindEnvironment(() => {
        this.producers.delete(producerAppData.producerClient);
        void ProducerServers.removeAsync({ producerId: producer.id });
      }),
    );

    // Create consumers for other existing transports (this is way more
    // transports than we actually want to use, but `createConsumer` will filter
    // it down)
    this.transports.forEach((transport, key) => {
      void this.createConsumer(key.split(":")[1]!, transport, producer);
    });

    const observer = this.observers.get(producerAppData.call);
    if (observer) {
      void observer.addProducer({ producerId: producer.id });
    }

    this.producers.set(producerAppData.producerClient, producer);
    void ProducerServers.insertAsync({
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
    consumer.observer.on(
      "close",
      Meteor.bindEnvironment(() => {
        this.consumers.delete(
          `${consumerAppData.transportRequest}:${consumer.producerId}`,
        );
        void Consumers.removeAsync({ consumerId: consumer.id });
      }),
    );

    consumer.observer.on(
      "pause",
      Meteor.bindEnvironment(() => {
        void Consumers.updateAsync(
          { consumerId: consumer.id },
          { $set: { paused: true } },
        );
      }),
    );
    consumer.observer.on(
      "resume",
      Meteor.bindEnvironment(() => {
        void Consumers.updateAsync(
          { consumerId: consumer.id },
          { $set: { paused: false } },
        );
      }),
    );

    this.consumers.set(
      `${consumerAppData.transportRequest}:${consumer.producerId}`,
      consumer,
    );
    void Consumers.insertAsync({
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

  onMonitorTransportCreated(transport: types.Transport) {
    const transportAppData = transport.appData as TransportAppData;

    // We're not wiring onTransportCreated up to non-monitor routers, so this
    // shouldn't happen
    if (transportAppData.type === "webrtc") {
      Logger.warn("Ignoring unexpected WebRTC transport", {
        error: new Error("Unexpected transport type"),
        call: transportAppData.call,
        peer: transportAppData.peer,
        transport: transport.id,
      });
      return;
    }

    if (!(transport.type === "pipe")) {
      Logger.warn("Ignoring unexpected non-pipe monitor transport", {
        transport: transport.id,
      });
      return;
    }

    const ptransport = transport as types.PipeTransport;

    if (transportAppData.type === "monitor-initiated") {
      transport.observer.on(
        "close",
        Meteor.bindEnvironment(() => {
          void MonitorConnectRequests.removeAsync({
            transportId: transport.id,
          });
        }),
      );

      void (async () => {
        const consumer = await transport.consumeData({
          dataProducerId: this.heartbeatDataProducer.id,
          // These options determine the reliability of the packets that we send
          // over the SCTP connection. (Remember that we're creating a consumer,
          // but consumer/producer are sort of backwards on the server side.)
          //
          // SCTP by default is ordered and reliable (i.e. dropped packets are
          // retransmitted), but we want neither of those behaviors. Allow the
          // receiver to deliver packets to the application out of order, and
          // allow the sender to aggressively give up on retransmission.
          //
          // Both of these are transmitted to the receiving end via
          // sctpStreamParameters.
          ordered: false,
          maxRetransmits: 1,
        });

        await MonitorConnectRequests.insertAsync({
          initiatingServer: serverId,
          receivingServer: transportAppData.server,
          transportId: ptransport.id,
          ip: ptransport.tuple.localIp,
          port: ptransport.tuple.localPort,
          srtpParameters: ptransport.srtpParameters
            ? JSON.stringify(ptransport.srtpParameters)
            : undefined,
          producerId: this.heartbeatDataProducer.id,
          producerSctpStreamParameters: consumer.sctpStreamParameters
            ? JSON.stringify(consumer.sctpStreamParameters)
            : undefined,
          producerLabel: consumer.label,
          producerProtocol: consumer.protocol,
        });
      })();
    } else if (transportAppData.type === "monitor-received") {
      ptransport.observer.on(
        "close",
        Meteor.bindEnvironment(() => {
          void MonitorConnectAcks.removeAsync({ transportId: transport.id });
        }),
      );

      void (async () => {
        try {
          await ptransport.connect({
            ip: transportAppData.ip,
            port: transportAppData.port,
            srtpParameters: transportAppData.srtpParameters,
          });

          const producer = await ptransport.produceData({
            id: transportAppData.producerId,
            sctpStreamParameters: transportAppData.producerSctpStreamParameters,
            label: transportAppData.producerLabel,
            protocol: transportAppData.producerProtocol,
          });
          const consumer = await this.heartbeatDirectTransport.consumeData({
            dataProducerId: producer.id,
          });
          consumer.on(
            "message",
            Meteor.bindEnvironment(() => {
              const watchdog = this.heartbeatWatchdogs.get(
                transportAppData.server,
              );
              watchdog?.resetTimeout();
            }),
          );

          await MonitorConnectAcks.insertAsync({
            initiatingServer: transportAppData.server,
            receivingServer: serverId,
            transportId: ptransport.id,
            ip: ptransport.tuple.localIp,
            port: ptransport.tuple.localPort,
            srtpParameters: ptransport.srtpParameters
              ? JSON.stringify(ptransport.srtpParameters)
              : undefined,
          });
        } catch (error) {
          Logger.error("Error connecting monitor transport", {
            direction: "receiving",
            transport: ptransport.id,
            initiatingServer: transportAppData.server,
            receivingServer: serverId,
            error,
          });
        }
      })();
    } else {
      Logger.error("Unexpected monitor transport type", {
        transport: ptransport.id,
        type: (transportAppData as any).type,
      });
    }
  }

  // Mongo callbacks

  peerRemoved(id: string) {
    this.peerToRtpCapabilities.delete(id);
  }

  async roomCreated(room: RoomType) {
    Logger.info("Creating router", { call: room.call });
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
    } catch (error) {
      Logger.error("Error creating router", { call: room.call, error });
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
      Logger.warn("No router for transport request", {
        call: transportRequest.call,
      });
      return;
    }

    const directions: ("send" | "recv")[] = ["send", "recv"];
    const transports = Promise.all(
      directions.map((direction) => {
        const appData: TransportAppData = {
          type: "webrtc",
          transportRequest: transportRequest._id,
          call: transportRequest.call,
          peer: transportRequest.peer,
          createdBy: transportRequest.createdBy,
          direction,
        };
        return router.createWebRtcTransport({
          listenInfos: this.ips.flatMap((listenIp) => {
            return [
              {
                ...listenIp,
                protocol: "udp",
              },
              {
                ...listenIp,
                protocol: "tcp",
              },
            ];
          }),
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          appData,
        });
      }),
    );
    this.transportRequestToTransports.set(transportRequest._id, transports);
    this.peerToRtpCapabilities.set(
      transportRequest.peer,
      JSON.parse(transportRequest.rtpCapabilities),
    );

    try {
      await transports;
    } catch (error) {
      Logger.error("Error creating transport", {
        transport_request: transportRequest._id,
        error,
      });
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
    const transport = this.transports.get(
      `${connectRequest.transportRequest}:${connectRequest.direction}`,
    );
    if (!transport) {
      Logger.warn("No transport for connect request", {
        call: connectRequest.call,
        peer: connectRequest.peer,
        direction: connectRequest.direction,
      });
      return;
    }

    try {
      await transport.connect({
        dtlsParameters: JSON.parse(connectRequest.dtlsParameters),
      });
      await ConnectAcks.insertAsync({
        call: connectRequest.call,
        createdServer: serverId,
        peer: connectRequest.peer,
        transportRequest: connectRequest.transportRequest,
        direction: connectRequest.direction,
        transport: connectRequest.transport,
        createdBy: connectRequest.createdBy,
      });
    } catch (error) {
      Logger.error("Error connecting transport", {
        transport: transport.id,
        error,
      });
    }
  }

  async producerClientCreated(producer: ProducerClientType) {
    const transport = this.transports.get(`${producer.transportRequest}:send`);
    if (!transport) {
      Logger.warn("No transport for producer client", {
        call: producer.call,
        peer: producer.peer,
        producer: producer._id,
      });
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
    } catch (error) {
      Logger.error("Error creating producer", {
        producer: producer._id,
        error,
      });
    }
  }

  async producerClientChanged(id: string, fields: Partial<ProducerClientType>) {
    if (!Object.prototype.hasOwnProperty.call(fields, "paused")) {
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
    const consumer = this.consumers.get(
      `${consumerAck.transportRequest}:${consumerAck.producerId}`,
    );
    if (!consumer) {
      Logger.warn("No consumer for consumer ack", {
        peer: consumerAck.peer,
        producer: consumerAck.producerId,
      });
      return;
    }

    await consumer.resume();
  }

  async serverCreated(server: ServerType) {
    Logger.info("New server detected, creating monitor transport", {
      server: server._id,
      hostname: server.hostname,
      pid: server.pid,
    });

    // As a note, we setup the watchdog when we create the outbound pipe
    // transport, but we actually only receive heartbeats when the _inbound_
    // pipe transport is initiated by the other server.
    const watchdog = new Watchdog(heartbeatTimeout, heartbeatInitialTimeout);
    watchdog.on(
      "timeout",
      Meteor.bindEnvironment(() => {
        Logger.warn(
          "Have not received heartbeat from server, marking as offline",
          {
            since: watchdog.lastActivity,
            server: server._id,
          },
        );
        void cleanupDeadServer(server._id);
      }),
    );
    this.heartbeatWatchdogs.set(server._id, watchdog);

    const appData: TransportAppData = {
      type: "monitor-initiated",
      server: server._id,
    };

    const transport = this.monitorRouter.createPipeTransport({
      listenInfo: { ...this.ips[0], protocol: "udp" },
      enableRtx: true,
      enableSrtp: true,
      enableSctp: true /* Enable SCTP so we can use DataChannels. */,
      appData,
    });
    this.serverToMonitorTransport.set(server._id, transport);

    try {
      await transport;
    } catch (error) {
      Logger.error("Error creating monitor transport", {
        server: server._id,
        error,
      });
    }
  }

  async serverRemoved(id: string) {
    const watchdog = this.heartbeatWatchdogs.get(id);
    if (watchdog) {
      this.heartbeatWatchdogs.delete(id);
      watchdog.stop();
    }

    const transport = this.serverToMonitorTransport.get(id);
    if (transport) {
      this.serverToMonitorTransport.delete(id);
      (await transport).close();
    }
  }

  async monitorConnectRequestCreated(request: MonitorConnectRequestType) {
    const appData: TransportAppData = {
      type: "monitor-received",
      server: request.initiatingServer,
      ip: request.ip,
      port: request.port,
      srtpParameters: request.srtpParameters
        ? JSON.parse(request.srtpParameters)
        : undefined,
      producerId: request.producerId,
      producerSctpStreamParameters: request.producerSctpStreamParameters
        ? JSON.parse(request.producerSctpStreamParameters)
        : undefined,
      producerLabel: request.producerLabel ?? "",
      producerProtocol: request.producerProtocol ?? "",
    };

    const transport = this.monitorRouter.createPipeTransport({
      listenInfo: { ...this.ips[0], protocol: "udp" },
      enableRtx: true,
      enableSrtp: true,
      enableSctp: true /* Enable SCTP so we can use DataChannels. */,
      appData,
    });
    this.monitorConnectRequestToTransport.set(request._id, transport);

    try {
      await transport;
    } catch (error) {
      Logger.error("Error creating receiving monitor transport", {
        initiatingServer: request.initiatingServer,
        error,
      });
    }
  }

  async monitorConnectRequestRemoved(id: string) {
    const transport = this.monitorConnectRequestToTransport.get(id);
    if (!transport) {
      return;
    }

    this.monitorConnectRequestToTransport.delete(id);
    (await transport).close();
  }

  async monitorConnectAckCreated(ack: MonitorConnectAckType) {
    const transportPromise = this.serverToMonitorTransport.get(
      ack.receivingServer,
    );
    if (!transportPromise) {
      Logger.warn("No monitor transport for connect ack", {
        receivingServer: ack.receivingServer,
      });
      return;
    }

    try {
      const transport = await transportPromise;
      await transport.connect({
        ip: ack.ip,
        port: ack.port,
        srtpParameters: ack.srtpParameters
          ? JSON.parse(ack.srtpParameters)
          : undefined,
      });
    } catch (error) {
      Logger.error("Error connecting initiating monitor transport", {
        receivingServer: ack.receivingServer,
        error,
      });
    }
  }
}

type IPSource = [
  resolver: string,
  lookup: string,
  rrtype: "A" | "TXT" | "AAAA",
];

const IPSources: { v4: IPSource[]; v6: IPSource[] } = {
  v4: [
    ["resolver1.opendns.com", "myip.opendns.com", "A"],
    ["ns1.google.com", "o-o.myaddr.l.google.com", "TXT"],
    ["ns1-1.akamaitech.net", "whoami.akamai.net", "A"],
  ],
  v6: [
    ["resolver1.opendns.com", "myip.opendns.com", "AAAA"],
    ["ns1.google.com", "o-o.myaddr.l.google.com", "TXT"],
  ],
};

const lookupIPSource = async (
  ipv: "v4" | "v6",
  [resolver, hostname, rrtype]: IPSource,
) => {
  const resolverAddress = await (ipv === "v4"
    ? dns.resolve4(resolver)
    : dns.resolve6(resolver));
  const r = new dns.Resolver();
  r.setServers(resolverAddress);
  switch (rrtype) {
    case "A":
      return r.resolve4(hostname);
    case "TXT":
      return (await r.resolveTxt(hostname)).flat();
    case "AAAA":
      return r.resolve6(hostname);
    default:
      throw new Error(`Unknown rrtype: ${rrtype}`);
  }
};

const lookupIPSources = async (ipv: "v4" | "v6") => {
  const sources = IPSources[ipv];
  const resolutions = Promise.all(
    sources.map(async (source) => {
      try {
        return await lookupIPSource(ipv, source);
      } catch (e) {
        return undefined;
      }
    }),
  );
  const ips = (await resolutions).filter(
    (res): res is string[] => res !== undefined,
  );
  // Get unique set of IPs
  return [...new Set(ips.flat())];
};

const getPublicIPAddresses = async (): Promise<ListenIp[]> => {
  const [ipv4, ipv6] = await Promise.all([
    lookupIPSources("v4"),
    lookupIPSources("v6"),
  ]);
  return [
    ipv4.map((a) => {
      return { ip: "0.0.0.0", announcedIp: a };
    }),
    ipv6.map((a) => {
      return { ip: "::", announcedIp: a };
    }),
  ].flat();
};

const getLocalIPAddresses = (): ListenIp[] => {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => {
      if (!addresses) {
        return [];
      }
      const filtered = addresses.filter((address) => {
        if (address.family === "IPv4") {
          return !address.internal;
        } else if (address.family === "IPv6") {
          const parsed = new Address6(address.address);
          return (
            !address.internal &&
            !parsed.isLoopback() &&
            !parsed.isLinkLocal() &&
            !parsed.isMulticast()
          );
        }
        return false;
      });

      // For each of IPv4 and IPv6, pick the last filtered address. For IPv6 in
      // particular, modern OS's generate new addresses periodically, which can
      // cause this list to otherwise get quite long.
      const ipv4 = [...filtered]
        .reverse()
        .find((address) => address.family === "IPv4");
      const ipv6 = [...filtered]
        .reverse()
        .find((address) => address.family === "IPv6");
      return [ipv4?.address, ipv6?.address].filter<string>((v): v is string =>
        Boolean(v),
      );
    })
    .map((ip) => {
      return { ip };
    });
};

registerPeriodicCleanupHook(async (deadServers) => {
  await MonitorConnectAcks.removeAsync({
    receivingServer: { $in: deadServers },
  });
  await MonitorConnectRequests.removeAsync({
    initiatingServer: { $in: deadServers },
  });

  await ConsumerAcks.removeAsync({ createdServer: { $in: deadServers } });
  await Consumers.removeAsync({ createdServer: { $in: deadServers } });

  await ProducerServers.removeAsync({ createdServer: { $in: deadServers } });
  await ProducerClients.removeAsync({ createdServer: { $in: deadServers } });

  await ConnectAcks.removeAsync({ createdServer: { $in: deadServers } });
  await ConnectRequests.removeAsync({ createdServer: { $in: deadServers } });

  await TransportStates.removeAsync({ createdServer: { $in: deadServers } });
  await Transports.removeAsync({ createdServer: { $in: deadServers } });
  await TransportRequests.removeAsync({ createdServer: { $in: deadServers } });

  await Routers.removeAsync({ createdServer: { $in: deadServers } });
});

// A note: the current behavior of Meteor.startup is that it blocks the
// application from serving requests until all startup functions have returned.
// However, it is not async-aware, so it will start serving requests before the
// mediasoup daemon is initialized. Because we only interface with mediasoup via
// database records, this should be safe, as we will pick up any prematurely
// created records when the daemon is eventually initialized. (And if the
// behavior of Meteor.startup changes in the future, that should be OK too)
Meteor.startup(async () => {
  const ips = Meteor.isDevelopment
    ? getLocalIPAddresses()
    : await getPublicIPAddresses();
  Logger.verbose("Discovered announceable IPs", {
    ips: ips.map((ip) => ip.announcedIp ?? ip.ip),
  });
  const [primaryIp, ...otherIps] = ips;
  if (!primaryIp) {
    throw new Meteor.Error("Unable to discover any IP addresses");
  }

  let sfu: SFU | undefined;
  const updateSFU = async (enable: boolean) => {
    const newSfu = enable
      ? await SFU.create([primaryIp, ...otherIps])
      : undefined;
    await sfu?.close();
    sfu = newSfu;
  };
  // The logic here looks backwards because when a feature flag is on, calls are
  // disabled.
  const observer = await Flags.observeChangesAsync(
    "disable.webrtc",
    (active) => {
      void updateSFU(!active);
    },
  );

  onExit(
    Meteor.bindEnvironment(async () => {
      observer.stop();
      await sfu?.close();
    }),
  );
});
