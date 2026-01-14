import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import type { types } from "mediasoup-client";
import type React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { logger as defaultLogger } from "../../Logger";
import { groupedBy } from "../../lib/listUtils";
import ConnectAcks from "../../lib/models/mediasoup/ConnectAcks";
import Consumers from "../../lib/models/mediasoup/Consumers";
import type { PeerType } from "../../lib/models/mediasoup/Peers";
import Peers from "../../lib/models/mediasoup/Peers";
import ProducerServers from "../../lib/models/mediasoup/ProducerServers";
import type { RouterType } from "../../lib/models/mediasoup/Routers";
import Routers from "../../lib/models/mediasoup/Routers";
import type { TransportType } from "../../lib/models/mediasoup/Transports";
import Transports from "../../lib/models/mediasoup/Transports";
import mediasoupAckConsumer from "../../methods/mediasoupAckConsumer";
import mediasoupAckPeerRemoteMute from "../../methods/mediasoupAckPeerRemoteMute";
import mediasoupConnectTransport from "../../methods/mediasoupConnectTransport";
import mediasoupSetPeerState from "../../methods/mediasoupSetPeerState";
import mediasoupSetProducerPaused from "../../methods/mediasoupSetProducerPaused";
import { PREFERRED_AUDIO_DEVICE_STORAGE_KEY } from "../components/AudioConfig";
import { trace } from "../tracing";
import useBlockUpdate from "./useBlockUpdate";

const logger = defaultLogger.child({ label: "useCallState" });

export enum CallJoinState {
  CHAT_ONLY = "chatonly",
  REQUESTING_STREAM = "requestingstream",
  STREAM_ERROR = "streamerror",
  IN_CALL = "call",
}

// A note on mute and deafen: being deafened implies you are also not
// broadcasting audio to other parties, because that would allow for
// situations where you are being disruptive to others but don't know it.
// This state value for muted is "explicitly muted" rather than "implicitly
// muted by deafen".  You are effectively muted (and will appear muted to
// other) if you are muted or deafened.  The `muted` boolean field here will
// only track if you are explicitly muted, but in all props for all children,
// the muted property represents "effectively muted".  (We track them
// separately because if you mute before deafening, then undeafen should
// leave you muted, and we'd lose that bit otherwise.)
export type AudioControls = {
  muted: boolean;
  deafened: boolean;
};

function participantState(explicitlyMuted: boolean, deafened: boolean) {
  if (deafened) {
    return "deafened";
  } else if (explicitlyMuted) {
    return "muted";
  } else {
    return "active";
  }
}

export type AudioState = {
  audioContext: AudioContext | undefined;
  mediaSource: MediaStream | undefined;
};
export type TransportState = {
  send: types.Transport | undefined;
  recv: types.Transport | undefined;
};

export type CallState = (
  | {
      callState:
        | CallJoinState.CHAT_ONLY
        | CallJoinState.REQUESTING_STREAM
        | CallJoinState.STREAM_ERROR;
      audioState?: AudioState;
    }
  | {
      callState: CallJoinState.IN_CALL;
      audioState: AudioState;
    }
) & {
  device: types.Device | undefined;
  transports: TransportState;
  transportStates: {
    send?: types.ConnectionState;
    recv?: types.ConnectionState;
  };
  router: RouterType | undefined;
  audioControls: AudioControls;
  selfPeer: PeerType | undefined;
  otherPeers: PeerType[];
  peerStreams: Map<string, MediaStream>; // map from Peer._id to stream
  // Whether or not to show an modal about the initial peer state.  We want to
  // show this on initial user-initiated call join, but not if we reconnect
  // after a server disconnection (rather than a user hang-up) since the state
  // there shouldn't be considered to have changed.
  allowInitialPeerStateNotification: boolean;
  remoteMutedBy: string | undefined;
  error: Error | undefined;
};

export type Action =
  | { type: "request-capture" }
  | { type: "capture-error"; error: Error }
  | { type: "join-call"; audioState: AudioState }
  | { type: "set-device"; device: types.Device | undefined }
  | {
      type: "set-transport";
      direction: "send" | "recv";
      transport: types.Transport | undefined;
    }
  | {
      type: "set-transport-state";
      direction: "send" | "recv";
      state: types.ConnectionState;
    }
  | { type: "set-router"; router: RouterType | undefined }
  | { type: "leave-call" }
  | { type: "toggle-mute" }
  | { type: "toggle-deafen" }
  | { type: "dismiss-peer-state-notification" }
  | { type: "set-remote-muted"; remoteMutedBy: string }
  | { type: "dismiss-remote-muted" }
  | {
      type: "set-peers";
      selfPeer: PeerType | undefined;
      otherPeers: PeerType[];
    }
  | { type: "add-peer-track"; peerId: string; track: MediaStreamTrack }
  | { type: "remove-peer-track"; peerId: string; track: MediaStreamTrack }
  | { type: "reset" };

const INITIAL_STATE: CallState = {
  callState: CallJoinState.CHAT_ONLY,
  audioControls: {
    muted: false,
    deafened: false,
  },
  device: undefined,
  transports: {
    send: undefined,
    recv: undefined,
  },
  transportStates: {},
  router: undefined,
  selfPeer: undefined,
  otherPeers: [] as PeerType[],
  peerStreams: new Map<string, MediaStream>(),
  allowInitialPeerStateNotification: false,
  remoteMutedBy: undefined,
  error: undefined,
};

function reducer(state: CallState, action: Action): CallState {
  logger.debug("dispatch", action);
  switch (action.type) {
    case "request-capture":
      return { ...state, callState: CallJoinState.REQUESTING_STREAM };
    case "capture-error":
      return {
        ...state,
        callState: CallJoinState.STREAM_ERROR,
        error: action.error,
      };
    case "join-call":
      return {
        ...state,
        callState: CallJoinState.IN_CALL,
        audioState: action.audioState,
        audioControls: {
          muted: false,
          deafened: false,
        },
        allowInitialPeerStateNotification: true,
        error: undefined,
      };
    case "set-device":
      return {
        ...state,
        device: action.device,
      };
    case "set-transport":
      return {
        ...state,
        transports: {
          ...state.transports,
          [action.direction]: action.transport,
        },
      };
    case "set-transport-state":
      return {
        ...state,
        transportStates: {
          ...state.transportStates,
          [action.direction]: action.state,
        },
      };
    case "set-router":
      return {
        ...state,
        router: action.router,
      };
    case "leave-call":
      return INITIAL_STATE;
    case "toggle-mute": {
      if (state.callState !== CallJoinState.IN_CALL || !state.audioControls) {
        throw new Error("Can't toggle mute if not in call");
      }
      const nextMuted = !(
        state.audioControls.deafened || state.audioControls.muted
      );
      return {
        ...state,
        audioControls: {
          muted: nextMuted,
          deafened: false,
        },
        allowInitialPeerStateNotification: false,
        remoteMutedBy: undefined,
      };
    }
    case "toggle-deafen":
      if (state.callState !== CallJoinState.IN_CALL || !state.audioControls) {
        throw new Error("Can't toggle mute if not in call");
      }
      return {
        ...state,
        audioControls: {
          muted: state.audioControls.muted,
          deafened: !state.audioControls.deafened,
        },
        allowInitialPeerStateNotification: false,
        remoteMutedBy: undefined,
      };
    case "dismiss-peer-state-notification":
      return {
        ...state,
        allowInitialPeerStateNotification: false,
      };
    case "set-remote-muted":
      return {
        ...state,
        audioControls: {
          muted: true,
          deafened: state.audioControls.deafened,
        },
        allowInitialPeerStateNotification: false,
        remoteMutedBy: action.remoteMutedBy,
      };
    case "dismiss-remote-muted":
      return {
        ...state,
        remoteMutedBy: undefined,
      };
    case "set-peers": {
      let audioControls = state.audioControls;
      if (
        (!state.selfPeer && action.selfPeer) ||
        (state.selfPeer &&
          action.selfPeer &&
          state.selfPeer._id !== action.selfPeer._id)
      ) {
        logger.debug("server set initial peer state", {
          initialPeerState: action.selfPeer.initialPeerState,
        });
        // When we are first joining the call (or rejoining the call with the
        // same hunt/call/tab due to a server outage), the server will present us
        // with the effective peer state (active, muted, or deafened) that it
        // thinks we should have.  If we are rejoining the call from the same
        // tab due to a server disconnect, the server will tell us to preserve
        // our previous call state; otherwise the server may tell us to start out
        // muted if the call is large or active otherwise.

        switch (action.selfPeer.initialPeerState) {
          case "active":
            audioControls = {
              muted: false,
              deafened: false,
            };
            break;
          case "muted":
            audioControls = {
              muted: true,
              deafened: false,
            };
            break;
          case "deafened":
            // In the case where we are reconnecting and were previously
            // deafened, preserve the hidden "explicitly muted" state, since
            // we'll be complying with the server's intent that our producer
            // tracks start out paused, and we shouldn't add or remove
            // explicit mute that is masked by being deafened.
            audioControls = {
              muted: state.audioControls.muted,
              deafened: true,
            };
            break;
          default:
            break;
        }
      }

      return {
        ...state,
        selfPeer: action.selfPeer,
        otherPeers: action.otherPeers,
        audioControls,
      };
    }
    case "add-peer-track": {
      const newStream = new MediaStream();
      state.peerStreams
        .get(action.peerId)
        ?.getTracks()
        .forEach((track) => {
          newStream.addTrack(track);
        });
      newStream.addTrack(action.track);
      const newPeerStreams = new Map(state.peerStreams);
      newPeerStreams.set(action.peerId, newStream);
      return {
        ...state,
        peerStreams: newPeerStreams,
      };
    }
    case "remove-peer-track": {
      const newStream = new MediaStream();
      let trackCount = 0;
      state.peerStreams
        .get(action.peerId)
        ?.getTracks()
        .forEach((track) => {
          if (track !== action.track) {
            trackCount += 1;
            newStream.addTrack(track);
          }
        });
      const newPeerStreams = new Map(state.peerStreams);
      if (trackCount > 0) {
        newPeerStreams.set(action.peerId, newStream);
      } else {
        newPeerStreams.delete(action.peerId);
      }
      return {
        ...state,
        peerStreams: newPeerStreams,
      };
    }
    case "reset":
      return INITIAL_STATE;
    default:
      throw new Error();
  }
}

const useTransport = (
  device: types.Device | undefined,
  direction: "send" | "recv",
  transportParams: TransportType | undefined,
  dispatch: React.Dispatch<Action>,
) => {
  const connectRef = useRef<(() => void) | undefined>(undefined);

  const hasParams = !!device && !!transportParams;
  useEffect(() => {
    if (hasParams) {
      const _id = transportParams._id;
      const transportId = transportParams.transportId;
      const iceParameters = transportParams.iceParameters;
      const iceCandidates = transportParams.iceCandidates;
      const serverDtlsParameters = transportParams.dtlsParameters;
      logger.info("Creating new Mediasoup transport", {
        transportId,
        direction,
      });
      const method =
        direction === "send" ? "createSendTransport" : "createRecvTransport";
      const newTransport = device[method]({
        id: transportId,
        iceParameters: JSON.parse(iceParameters),
        iceCandidates: JSON.parse(iceCandidates),
        dtlsParameters: JSON.parse(serverDtlsParameters),
        iceServers: transportParams.turnConfig
          ? [transportParams.turnConfig]
          : undefined,
        appData: {
          _id,
        },
      });
      newTransport.on(
        "connect",
        ({ dtlsParameters: clientDtlsParameters }, callback) => {
          connectRef.current = callback;
          // No need to set a callback here, since the ConnectAck record acts as a
          // callback
          mediasoupConnectTransport.call({
            transportId: _id,
            dtlsParameters: JSON.stringify(clientDtlsParameters),
          });
        },
      );
      newTransport.on("connectionstatechange", (state) => {
        if (state === "failed") {
          logger.warn("Transport connection failed", {
            transportId,
            direction,
            newTransport,
          });
        }
        dispatch({
          type: "set-transport-state",
          direction,
          state,
        });
      });
      logger.debug("setting transport", { direction, newTransport });
      dispatch({
        type: "set-transport",
        direction,
        transport: newTransport,
      });
      return () => {
        if (!newTransport.closed) newTransport.close();
      };
    } else {
      logger.debug("clearing transport", { direction });
      dispatch({
        type: "set-transport",
        direction,
        transport: undefined,
      });
      return undefined;
    }
  }, [
    device,
    hasParams,
    direction,
    dispatch,
    transportParams?._id,
    transportParams?.transportId,
    transportParams?.iceParameters,
    transportParams?.iceCandidates,
    transportParams?.dtlsParameters,
    transportParams?.turnConfig,
  ]);

  return connectRef;
};

function cleanupProducerMapEntry(
  map: Map<string, ProducerState>,
  trackId: string,
) {
  const producerState = map.get(trackId);
  if (producerState) {
    // Stop the producer if present
    if (producerState.producer) {
      logger.debug("stopping producer for track", { trackId });
      producerState.producer.close();
    }

    // Stop the producer sub if present.
    if (producerState.subHandle) {
      logger.debug("stopping producer sub for track", { trackId });
      producerState.subHandle.stop();
    }

    // Drop the removed track from the producerMapRef.
    logger.debug("producerMapRef.delete", { trackId });
    map.delete(trackId);
  }
}

type ProducerCallback = ({ id }: { id: string }) => void;
type ProducerState = {
  transport: string;
  producer: types.Producer | undefined;
  subHandle: Meteor.SubscriptionHandle | undefined;
  producerServerCallback: ProducerCallback | undefined;
  kind: string | undefined;
  rtpParameters: string | undefined;
};

type ConsumerState = {
  consumer: types.Consumer | undefined;
  peerId: string;
};

const useCallState = ({
  huntId,
  puzzleId,
  tabId,
}: {
  huntId: string;
  puzzleId: string;
  tabId: string;
}): {
  state: CallState;
  dispatch: React.Dispatch<Action>;
  joinCall: () => void;
} => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // If we're currently in a call, block code pushes
  useBlockUpdate(
    state.callState !== CallJoinState.CHAT_ONLY
      ? "You're currently in an audio call"
      : undefined,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies(huntId): We want to reset if the user navigates to a new puzzle
  // biome-ignore lint/correctness/useExhaustiveDependencies(puzzleId): See above
  // biome-ignore lint/correctness/useExhaustiveDependencies(tabId): See above
  useEffect(() => {
    return () => {
      logger.debug("huntId/puzzleId/tabId changed, resetting call state");
      dispatch({ type: "reset" });
    };
  }, [huntId, puzzleId, tabId]);

  useEffect(() => {
    // When mediaSource (the mic capture stream) changes, stop all the tracks.
    const mediaSource = state.audioState?.mediaSource;
    return () => {
      if (mediaSource) {
        mediaSource.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [state.audioState?.mediaSource]);

  // We cannot use `useSubscribe` here (nor for 'mediasoup:transports' below)
  // due to the following interactions:
  //
  // * we use these subscriptions to trigger server-side state changes
  // * those server-side state changes are /not/ idempotent, because in the event
  //   of a transient disconnection, we'd like to remove the old call
  //   participant and transports promptly so it doesn't look weird in the call
  //   UI.  Thus, these subs follow a last-writer-wins policy.
  // * React's lifecycle reserves the right to rerun the render() body multiple times per
  //   render. StrictMode actively exercises this to help find bugs that this behavior
  //   triggers.
  // * `useTracker` (and thus, `useSubscribe`) run the inner function for the first time
  //   within render() rather than waiting until the effect phase.
  //
  // Taken together, if we used `useSubscribe` here, we can get into a situation
  // where the 'mediasoup:join' subscription is initiated twice with the same
  // parameters (and the instance that is immediately cleaned up is the one that
  // was issued /second/), so then the backend removes all Peer records for this
  // particular hunt/puzzle/tab.
  //
  // Since we require subscribe-exactly-once semantics due to how we use these
  // as a sort of method-with-automatic-serverside-cleanup, the best thing for
  // us to do here is simply manage the lifecycle of the non-idempotent
  // subscriptions ourselves, strictly in the effect phase, with a ref.
  const joinSubRef = useRef<Meteor.SubscriptionHandle | undefined>(undefined);
  useEffect(() => {
    if (state.callState === CallJoinState.IN_CALL && !joinSubRef.current) {
      // Subscribe to 'mediasoup:join' for huntId, puzzleId, tabId
      joinSubRef.current = Meteor.subscribe(
        "mediasoup:join",
        huntId,
        puzzleId,
        tabId,
      );
    }

    return () => {
      if (joinSubRef.current) {
        joinSubRef.current.stop();
        joinSubRef.current = undefined;
      }
    };
  }, [state.callState, huntId, puzzleId, tabId]);

  const userId = useTracker(() => Meteor.userId(), []);
  // TODO: consider using useFind once fixed upstream
  const peers = useTracker(
    () => Peers.find({ hunt: huntId, call: puzzleId }).fetch(),
    [huntId, puzzleId],
  );
  const selfPeer = useMemo(() => {
    return peers.find(
      (peer) => peer.createdBy === userId && peer.tab === tabId,
    );
  }, [peers, tabId, userId]);
  const otherPeers = useMemo(
    () => peers.filter((p) => p._id !== selfPeer?._id),
    [peers, selfPeer?._id],
  );
  // Make sure to keep state.peers up-to-date.
  useEffect(() => {
    dispatch({ type: "set-peers", selfPeer, otherPeers });
  }, [selfPeer, otherPeers]);
  const router = useTracker(
    () => Routers.findOne({ call: puzzleId }),
    [puzzleId],
  );
  useEffect(() => {
    dispatch({ type: "set-router", router });
  }, [router]);

  // Once we have the Router for this room, we can create a mediasoup client device.
  // If we disconnect from the call, though, we want to make sure to get a new
  // Device for the next call.
  const device = state.device;
  useEffect(() => {
    if (router?._id) {
      void (async () => {
        logger.info("Fetching mediasoup-client code");
        const { Device } = await import("mediasoup-client");
        logger.info("Creating new Mediasoup device");
        const newDevice = new Device();
        await newDevice.load({
          routerRtpCapabilities: JSON.parse(router.rtpCapabilities),
        });
        dispatch({ type: "set-device", device: newDevice });
      })();
    } else {
      logger.info("Clearing Mediasoup device");
      dispatch({ type: "set-device", device: undefined });
    }
  }, [router?._id, router?.rtpCapabilities]);

  const rtpCaps = device ? JSON.stringify(device.rtpCapabilities) : undefined;
  const transportSubHandle = useRef<Meteor.SubscriptionHandle | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!transportSubHandle.current && device && selfPeer?._id) {
      logger.debug("subscribe mediasoup:transports", {
        peerId: selfPeer._id,
        rtpCaps,
      });
      transportSubHandle.current = Meteor.subscribe(
        "mediasoup:transports",
        selfPeer._id,
        rtpCaps,
      );
    }

    return () => {
      if (transportSubHandle.current) {
        transportSubHandle.current.stop();
        transportSubHandle.current = undefined;
      }
    };
  }, [device, selfPeer?._id, rtpCaps]);

  const hasSelfPeer = !!selfPeer;
  const { sendServerParams, recvServerParams } = useTracker(() => {
    return {
      // Note that these queries don't pin to the specific TransportRequest
      // created by the subscription above, so for some reason we delete and
      // recreate that subscription, we might transiently see the old Transports
      // instead of the current ones. As the old subscription is torn down, the
      // old Transports will be deleted as well, so this should converge on its
      // own.
      sendServerParams: hasSelfPeer
        ? Transports.findOne({ peer: selfPeer._id, direction: "send" })
        : undefined,
      recvServerParams: hasSelfPeer
        ? Transports.findOne({ peer: selfPeer._id, direction: "recv" })
        : undefined,
    };
  }, [hasSelfPeer, selfPeer?._id]);

  // We now believe we have the parameters we need to connect call transports.

  // Because our connection might be to a different server than the mediasoup
  // router is hosted on, the Meteor transport_connect call will return before
  // the connection parameters have been passed to the server-side transport.
  // Therefore, stash the acknowledgement callback on a ref and call it once the
  // corresponding ConnectAck db record is created.
  const sendTransportConnectCallback = useTransport(
    device,
    "send",
    sendServerParams,
    dispatch,
  );
  const recvTransportConnectCallback = useTransport(
    device,
    "recv",
    recvServerParams,
    dispatch,
  );
  const sendTransport = state.transports.send;
  const recvTransport = state.transports.recv;
  useEffect(() => {
    if (hasSelfPeer) {
      const observerPromise = ConnectAcks.find({
        peer: selfPeer._id,
      }).observeChangesAsync({
        added: (_id, fields) => {
          if (fields.direction === "send") {
            sendTransportConnectCallback.current?.();
            sendTransportConnectCallback.current = undefined;
          } else if (fields.direction === "recv") {
            recvTransportConnectCallback.current?.();
            recvTransportConnectCallback.current = undefined;
          }
        },
      });
      return () => {
        observerPromise.then(
          (handle) => handle.stop(),
          (error) => {
            logger.error("ConnectAcks observeChangesAsync rejected:", error);
          },
        );
      };
    }
    return undefined;
  }, [
    hasSelfPeer,
    selfPeer?._id,
    sendTransportConnectCallback,
    recvTransportConnectCallback,
  ]);

  // ==========================================================================
  // Producer (audio from local microphone, sending to server) logic
  // Extract the tracks from the current media source stream
  const [producerTracks, setProducerTracks] = useState<MediaStreamTrack[]>([]);
  useEffect(() => {
    // Use Meteor.defer here because the addtrack/removetrack events seem to
    // sometimes fire _before_ the track has actually been added to the stream's
    // track set.
    const stream = state.audioState?.mediaSource;
    if (stream) {
      const captureTracks = () =>
        Meteor.defer(() => setProducerTracks(stream.getTracks()));
      captureTracks();
      stream.addEventListener("addtrack", captureTracks);
      stream.addEventListener("removetrack", captureTracks);
      return () => {
        stream.removeEventListener("addtrack", captureTracks);
        stream.removeEventListener("removetrack", captureTracks);
      };
    } else {
      setProducerTracks([]);
      return undefined;
    }
  }, [state.audioState?.mediaSource]);

  // For each track we're capturing, we want to tell the backend we'd like to
  // send it a stream, and create a mediasoup producer for that track.
  // Since the backend would like us to do this once per track and to not flap
  // our intent-to-stream subscription, we carefully manage the lifecycle of
  // these objects, and use a couple generation counters to help trigger
  // callbacks when particular fields of any object in the map changes.

  // The general lifecycle of a producer is:
  //
  // 1. a track appears in producerTracks.  If that track's id is not known to
  //    producerMapRef, then we add an entry with all undefined fields and:
  // 2. we ask mediasoup to produce for this track.  It calls onProduce, giving
  //    us a kind and a set of rtpParameters, which we save in the map.  Because
  //    nothing else would trigger an effect, we update producerParamsGeneration
  //    to trigger the next step, where:
  // 3. we call Meteor.subscribe('mediasoup:producer') with those rtpParameters.
  // 4. The backend does some work, and then writes a new record to
  //    ProducerServers for that track id, and that record includes a transport ID.
  // 5. we call mediasoup's producerServerCallback with that transport ID.
  // 6. the transport.produce() call from step 2 finally yields a mediasoup
  //    Producer object, which we save in the producerMapRef.  Since we now have a
  //    new producer, we increment producerGeneration to ensure we trigger the next
  //    effect:
  // 7. we pause or unpause the Producer to track mute/deafen state
  // 8. the user wants to end the call, so we stop() the subscription and
  //    close() the Producer, and remove it from producerMapRef

  // A map from track ID to state for that track, including subscription handle,
  // mediasoup Producer, and a call-exactly-once callback function, all of
  // which need careful lifecycle handling and explicit cleanup.
  const producerMapRef = useRef<Map<string, ProducerState>>(new Map());

  // When producer params change (as a result of the onProduce callback being
  // called below from mediasoup), we need to both release any stream bound to
  // previous parameters and set up a new stream.  Since these parameters are
  // stored by mutating entries in producerMapRef, we need a way to trigger the
  // effect that will tell the backend about our rtpParameters.
  // Incremented whenever the `kind` or `rtpParameters` of an entry
  // in `producerMapRef` are written to a new value.
  // Used in the deps array of the effect which consumes those fields and
  // subscribes to 'mediasoup:producer'
  const [producerParamsGeneration, setProducerParamsGeneration] =
    useState<number>(0);

  // Once we have a ready producer (or producers), we want to be sure that their
  // pause states and server-side mute/deafen states are all appropriately set.
  // Incremented whenever the `producer` of an entry in `producerMapRef` is written
  // to a new values.
  // Used in the deps array of the effect which pauses or resumes the producer.
  const [producerGeneration, setProducerGeneration] = useState<number>(0);

  const onProduce = useCallback(
    (
      {
        kind,
        rtpParameters,
        appData,
      }: {
        kind: string;
        rtpParameters: types.RtpParameters;
        appData: any;
      },
      callback: ProducerCallback,
    ) => {
      logger.debug("onProduce", { kind, trackId: appData.trackId });
      // extract track Id from app data
      const producerState = producerMapRef.current.get(appData.trackId);
      if (!producerState) {
        logger.error("Got onProduce callback but found no producer state", {
          trackId: appData.trackId,
        });
      } else {
        producerState.kind = kind;
        producerState.rtpParameters = JSON.stringify(rtpParameters);
        producerState.producerServerCallback = callback;
        setProducerParamsGeneration((prevValue) => prevValue + 1);
      }
    },
    [],
  );
  useEffect(() => {
    if (sendTransport) {
      sendTransport?.on("produce", onProduce);
      return () => {
        sendTransport?.off("produce", onProduce);
      };
    }
    return undefined;
  }, [sendTransport, onProduce]);

  useEffect(() => {
    const observerPromise = ProducerServers.find().observeChangesAsync({
      added: (_id, fields) => {
        logger.debug("ProducerServers added", { _id, ...fields });
        const trackId = fields.trackId;
        if (!trackId) {
          logger.error("No trackId in new ProducerServers record", {
            _id,
            ...fields,
          });
          return;
        }
        const producerState = producerMapRef.current.get(trackId);
        if (producerState?.producerServerCallback) {
          logger.debug("Calling producerServerCallback", {
            id: fields.producerId,
          });
          producerState.producerServerCallback({ id: fields.producerId! });
          producerState.producerServerCallback = undefined;
          logger.debug("Outbound track live");
        }
      },
    });
    return () => {
      observerPromise.then(
        (handle) => handle.stop(),
        (error) => {
          logger.error("ProducerServers observeChangesAsync rejected:", error);
        },
      );
    };
  }, []);

  const producerShouldBePaused =
    state.audioControls?.muted || state.audioControls?.deafened;
  // biome-ignore lint/correctness/useExhaustiveDependencies(producerParamsGeneration): We want to force this effect to run when producerParams changes
  useEffect(() => {
    logger.debug("producerTracks", { tracks: producerTracks.map((t) => t.id) });
    const activeTrackIds = new Set();
    producerTracks.forEach((track) => {
      activeTrackIds.add(track.id);
      // Subscribe if no sub created yet

      if (sendTransport) {
        let producerState = producerMapRef.current.get(track.id);
        if (
          !producerState ||
          producerState.transport !== sendTransport.appData._id
        ) {
          // Create empty entry, before we attempt to produce for the track
          producerState = {
            transport: (sendTransport.appData as any)._id,
            producer: undefined,
            subHandle: undefined,
            producerServerCallback: undefined,
            kind: undefined,
            rtpParameters: undefined,
          };
          producerMapRef.current.set(track.id, producerState);
          logger.info("Creating Mediasoup producer", { track: track.id });
          // Tell the mediasoup library to produce a stream from this track.
          void (async () => {
            const newProducer = await sendTransport.produce({
              track,
              zeroRtpOnPause: true,
              stopTracks: false,
              appData: { trackId: track.id },
            });
            logger.debug("got producer", newProducer);
            const entry = producerMapRef.current.get(track.id);
            if (entry) {
              entry.producer = newProducer;
            } else {
              logger.error("No entry in producerMapRef for track", {
                trackId: track.id,
              });
            }
            setProducerGeneration((prevValue) => prevValue + 1);
          })();
        }

        if (
          !producerState.subHandle &&
          producerState.kind &&
          producerState.rtpParameters
        ) {
          // Indicate intent to produce to the backend.
          const paused = producerShouldBePaused;
          logger.debug("subscribe mediasoup:producer", {
            tp: sendTransport.appData._id,
            track: track.id,
            kind: producerState.kind,
            paused,
          });
          producerState.subHandle = Meteor.subscribe(
            "mediasoup:producer",
            sendTransport.appData._id,
            track.id,
            producerState.kind,
            producerState.rtpParameters,
            paused,
          );
        }
      }
    });

    // Drop any producers for tracks that are no longer in producerTracks.
    producerMapRef.current.forEach((_producerState, trackId) => {
      if (!activeTrackIds.has(trackId)) {
        cleanupProducerMapEntry(producerMapRef.current, trackId);
      }
    });
  }, [
    sendTransport,
    producerTracks,
    producerParamsGeneration,
    producerShouldBePaused,
  ]);

  // Ensure mute state is respected by mediasoup.
  // biome-ignore lint/correctness/useExhaustiveDependencies(producerGeneration): We want to force this effect to run when we create a new producer
  useEffect(() => {
    if (producerShouldBePaused !== undefined) {
      // Update producer pause state
      producerTracks.forEach((track) => {
        const producer = producerMapRef.current.get(track.id)?.producer;
        if (producer && producerShouldBePaused !== producer.paused) {
          if (producerShouldBePaused) {
            track.enabled = false;
            logger.debug("pausing producer for track", { track: track.id });
            producer.pause();
          } else {
            track.enabled = true;
            logger.debug("resuming producer for track", { track: track.id });
            producer.resume();
          }
          mediasoupSetProducerPaused.call(
            {
              mediasoupProducerId: producer.id,
              paused: producerShouldBePaused,
            },
            (error) => {
              if (error) {
                logger.error(
                  "Error calling mediasoupSetProducerPaused method",
                  { error, trackId: track.id },
                );
              }
            },
          );
        }
      });
    }
  }, [producerTracks, producerShouldBePaused, producerGeneration]);

  useEffect(() => {
    // If we've been remote-muted, acknowledge to the server and translate into local mute.
    if (selfPeer?.remoteMutedBy) {
      dispatch({
        type: "set-remote-muted",
        remoteMutedBy: selfPeer.remoteMutedBy,
      });
      mediasoupAckPeerRemoteMute.call({ peerId: selfPeer._id });
    }
  }, [selfPeer?._id, selfPeer?.remoteMutedBy]);
  // otherwise we update peer state so that mute/deafen are visible to others.
  useEffect(() => {
    const audioControls = state.audioControls;
    if (selfPeer && !selfPeer.remoteMutedBy && audioControls) {
      const serverEffectiveState = participantState(
        selfPeer.muted,
        selfPeer.deafened,
      );
      const localEffectiveState = participantState(
        audioControls.muted,
        audioControls.deafened,
      );
      if (serverEffectiveState !== localEffectiveState) {
        mediasoupSetPeerState.call({
          peerId: selfPeer._id,
          state: localEffectiveState,
        });
      }
    }
  }, [
    selfPeer,
    state.audioControls?.muted,
    state.audioControls?.deafened,
    state.audioControls,
  ]);

  // Ensure we clean up producers when unmounting.
  useEffect(() => {
    const producerMap = producerMapRef.current;
    return () => {
      producerMap.forEach((_producerState, trackId) => {
        cleanupProducerMapEntry(producerMap, trackId);
      });
    };
  }, []);

  // ==========================================================================
  // Consumer (audio from other peers, fetching from server) logic
  // TODO: consider using useFind once fixed upstream
  const puzzleConsumers = useTracker(
    () => Consumers.find({ call: puzzleId }, { sort: { _id: 1 } }).fetch(),
    [puzzleId],
  );
  const groupedConsumers = useMemo(() => {
    return groupedBy(puzzleConsumers, (consumer) => consumer.producerPeer);
  }, [puzzleConsumers]);

  // Map from consumer._id to our working state for that consumer.
  const consumerMapRef = useRef<Map<string, ConsumerState>>(new Map());

  const cleanupConsumer = useCallback(
    (meteorId: string, consumerState: ConsumerState) => {
      // Drop it.
      if (consumerState.consumer) {
        logger.debug("Stopping consumer", { meteorId });
        consumerState.consumer.close();
        dispatch({
          type: "remove-peer-track",
          peerId: consumerState.peerId,
          track: consumerState.consumer.track,
        });
      }

      // Delete it.
      logger.debug("consumerMapRef delete", { meteorId });
      consumerMapRef.current.delete(meteorId);
    },
    [],
  );

  useEffect(() => {
    const activeConsumerIds = new Set();
    const activePeerIds = new Set();
    if (state.callState === CallJoinState.IN_CALL) {
      otherPeers.forEach((peer) => {
        activePeerIds.add(peer._id);
        const consumers = groupedConsumers.get(peer._id) ?? [];
        consumers.forEach((consumer) => {
          const {
            _id: meteorConsumerId,
            consumerId: mediasoupConsumerId,
            producerId,
            kind,
            rtpParameters,
            paused,
          } = consumer;
          activeConsumerIds.add(consumer._id);
          if (recvTransport) {
            if (!consumerMapRef.current.has(consumer._id)) {
              consumerMapRef.current.set(consumer._id, {
                consumer: undefined,
                peerId: peer._id,
              });
              logger.debug("consumers", {
                consumerMapRef: consumerMapRef.current,
              });
              // Create a new Mediasoup consumer
              void (async () => {
                logger.info("Creating new Mediasoup consumer", {
                  mediasoupConsumerId,
                  producerId,
                });
                const newConsumer = await recvTransport.consume({
                  id: mediasoupConsumerId,
                  producerId,
                  kind,
                  rtpParameters: JSON.parse(rtpParameters),
                });
                logger.debug("new consumer", { newConsumer });
                const entry = consumerMapRef.current.get(consumer._id);
                if (entry) {
                  // Save on the ref so we can clean it up later if needed.
                  entry.consumer = newConsumer;
                  // Push the track into state.
                  dispatch({
                    type: "add-peer-track",
                    peerId: peer._id,
                    track: newConsumer.track,
                  });
                  mediasoupAckConsumer.call({ consumerId: meteorConsumerId });
                } else {
                  logger.error(
                    "Created Mediasoup consumer for consumer not in consumerMapRef",
                    { consumer: consumer._id },
                  );
                }
              })();
            }

            const consumerState = consumerMapRef.current.get(consumer._id);
            if (consumerState?.consumer) {
              if (consumerState.consumer.paused !== paused) {
                if (paused) {
                  consumerState.consumer.pause();
                } else {
                  consumerState.consumer.resume();
                }
              }
            }
          }
        });
      });
    }

    // Clean up any no-longer-present consumers
    consumerMapRef.current.forEach((consumerState, meteorId) => {
      if (!activeConsumerIds.has(meteorId)) {
        cleanupConsumer(meteorId, consumerState);
      }
    });
  }, [
    state.callState,
    recvTransport,
    otherPeers,
    groupedConsumers,
    cleanupConsumer,
  ]);

  useEffect(() => {
    // Also clean up consumers on unmount.
    const consumerMap = consumerMapRef.current;
    return () => {
      consumerMap.forEach((consumerState, meteorId) => {
        cleanupConsumer(meteorId, consumerState);
      });
    };
  }, [cleanupConsumer]);

  const joinCall = useCallback(() => {
    void (async () => {
      trace("useCallState joinCall");
      if (navigator.mediaDevices) {
        dispatch({ type: "request-capture" });
        const preferredAudioDeviceId =
          localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ?? undefined;
        // Get the user media stream.
        const mediaStreamConstraints = {
          audio: {
            echoCancellation: { ideal: true },
            autoGainControl: { ideal: true },
            noiseSuppression: { ideal: true },
            deviceId: preferredAudioDeviceId,
          },
          // TODO: conditionally allow video if enabled by feature flag?
        };

        let mediaSource: MediaStream;
        try {
          mediaSource = await navigator.mediaDevices.getUserMedia(
            mediaStreamConstraints,
          );
        } catch (e) {
          dispatch({ type: "capture-error", error: e as Error });
          return;
        }

        const AudioContext =
          window.AudioContext ||
          (window as { webkitAudioContext?: AudioContext }).webkitAudioContext;
        const audioContext = new AudioContext();

        dispatch({
          type: "join-call",
          audioState: {
            mediaSource,
            audioContext,
          },
        });
      } else {
        const msg =
          "Couldn't get local microphone: browser denies access on non-HTTPS origins";
        dispatch({ type: "capture-error", error: new Error(msg) });
      }
    })();
  }, []);

  return {
    state,
    dispatch,
    joinCall,
  };
};

export default useCallState;
