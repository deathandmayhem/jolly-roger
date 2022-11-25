/* eslint-disable no-console */
import { Meteor } from 'meteor/meteor';
import { useFind, useTracker } from 'meteor/react-meteor-data';
import { Device, types } from 'mediasoup-client';
import React, {
  useEffect, useMemo, useReducer, useRef, useState, useCallback,
} from 'react';
import { groupedBy } from '../../lib/listUtils';
import ConnectAcks from '../../lib/models/mediasoup/ConnectAcks';
import Consumers from '../../lib/models/mediasoup/Consumers';
import Peers from '../../lib/models/mediasoup/Peers';
import ProducerServers from '../../lib/models/mediasoup/ProducerServers';
import Routers from '../../lib/models/mediasoup/Routers';
import Transports from '../../lib/models/mediasoup/Transports';
import { PeerType } from '../../lib/schemas/mediasoup/Peer';
import { RouterType } from '../../lib/schemas/mediasoup/Router';
import { TransportType } from '../../lib/schemas/mediasoup/Transport';
import mediasoupAckConsumer from '../../methods/mediasoupAckConsumer';
import mediasoupConnectTransport from '../../methods/mediasoupConnectTransport';
import mediasoupSetPeerState from '../../methods/mediasoupSetPeerState';
import mediasoupSetProducerPaused from '../../methods/mediasoupSetProducerPaused';

const DEBUG_LOGGING = false;

function log(...args: any[]) {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}

export enum CallJoinState {
  CHAT_ONLY = 'chatonly',
  REQUESTING_STREAM = 'requestingstream',
  STREAM_ERROR = 'streamerror',
  IN_CALL = 'call',
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
    return 'deafened';
  } else if (explicitlyMuted) {
    return 'muted';
  } else {
    return 'active';
  }
}

export type AudioState = {
  audioContext: AudioContext | undefined;
  mediaSource: MediaStream | undefined;
};
export type Transports = {
  send: types.Transport | undefined;
  recv: types.Transport | undefined;
};

export type CallState = ({
  callState: CallJoinState.CHAT_ONLY | CallJoinState.REQUESTING_STREAM | CallJoinState.STREAM_ERROR;
  audioState?: AudioState;
} | {
  callState: CallJoinState.IN_CALL;
  audioState: AudioState;
}) & {
  device: types.Device | undefined;
  transports: Transports;
  router: RouterType | undefined;
  audioControls: AudioControls;
  selfPeer: PeerType | undefined;
  otherPeers: PeerType[];
  peerStreams: Map<string, MediaStream>; // map from Peer._id to stream
};

export type Action =
  | { type: 'request-capture' }
  | { type: 'capture-error', error: Error }
  | { type: 'join-call', audioState: AudioState }
  | { type: 'set-device', device: types.Device | undefined }
  | { type: 'set-transport', direction: 'send' | 'recv', transport: types.Transport | undefined }
  | { type: 'set-router', router: RouterType | undefined }
  | { type: 'leave-call' }
  | { type: 'toggle-mute' }
  | { type: 'toggle-deafen' }
  | { type: 'set-peers', selfPeer: PeerType | undefined, otherPeers: PeerType[] }
  | { type: 'add-peer-track', peerId: string, track: MediaStreamTrack }
  | { type: 'remove-peer-track', peerId: string, track: MediaStreamTrack }
  | { type: 'reset' };

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
  router: undefined,
  selfPeer: undefined,
  otherPeers: [] as PeerType[],
  peerStreams: new Map<string, MediaStream>(),
};

function reducer(state: CallState, action: Action): CallState {
  log('dispatch', action);
  switch (action.type) {
    case 'request-capture':
      return { ...state, callState: CallJoinState.REQUESTING_STREAM };
    case 'capture-error':
      return { ...state, callState: CallJoinState.STREAM_ERROR };
    case 'join-call':
      return {
        ...state,
        callState: CallJoinState.IN_CALL,
        audioState: action.audioState,
        audioControls: {
          muted: false,
          deafened: false,
        },
      };
    case 'set-device':
      return {
        ...state,
        device: action.device,
      };
    case 'set-transport':
      return {
        ...state,
        transports: {
          ...state.transports,
          [action.direction]: action.transport,
        },
      };
    case 'set-router':
      return {
        ...state,
        router: action.router,
      };
    case 'leave-call':
      return INITIAL_STATE;
    case 'toggle-mute': {
      if (state.callState !== CallJoinState.IN_CALL || !state.audioControls) {
        throw new Error("Can't toggle mute if not in call");
      }
      const nextMuted = !(state.audioControls.deafened || state.audioControls.muted);
      return {
        ...state,
        audioControls: {
          muted: nextMuted,
          deafened: false,
        },
      };
    }
    case 'toggle-deafen':
      if (state.callState !== CallJoinState.IN_CALL || !state.audioControls) {
        throw new Error("Can't toggle mute if not in call");
      }
      return {
        ...state,
        audioControls: {
          muted: state.audioControls.muted,
          deafened: !state.audioControls.deafened,
        },
      };
    case 'set-peers':
      return {
        ...state,
        selfPeer: action.selfPeer,
        otherPeers: action.otherPeers,
      };
    case 'add-peer-track': {
      const newStream = new MediaStream();
      state.peerStreams.get(action.peerId)?.getTracks().forEach((track) => {
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
    case 'remove-peer-track': {
      const newStream = new MediaStream();
      let trackCount = 0;
      state.peerStreams.get(action.peerId)?.getTracks().forEach((track) => {
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
    case 'reset':
      return INITIAL_STATE;
    default:
      throw new Error();
  }
}

const useTransport = (
  device: types.Device | undefined,
  direction: 'send' | 'recv',
  transportParams: TransportType | undefined,
  dispatch: React.Dispatch<Action>,
) => {
  const connectRef = useRef<() => void>();

  const hasParams = !!device && !!transportParams;
  useEffect(() => {
    if (hasParams) {
      const _id = transportParams._id;
      const transportId = transportParams.transportId;
      const iceParameters = transportParams.iceParameters;
      const iceCandidates = transportParams.iceCandidates;
      const serverDtlsParameters = transportParams.dtlsParameters;
      console.log('Creating new Mediasoup transport', { transportId, direction });
      const method = direction === 'send' ? 'createSendTransport' : 'createRecvTransport';
      const newTransport = device[method]({
        id: transportId,
        iceParameters: JSON.parse(iceParameters),
        iceCandidates: JSON.parse(iceCandidates),
        dtlsParameters: JSON.parse(serverDtlsParameters),
        appData: {
          _id,
        },
      });
      newTransport.on('connect', ({ dtlsParameters: clientDtlsParameters }, callback) => {
        connectRef.current = callback;
        // No need to set a callback here, since the ConnectAck record acts as a
        // callback
        mediasoupConnectTransport.call({
          transportId: _id,
          dtlsParameters: JSON.stringify(clientDtlsParameters),
        }, (err) => {
          if (err) {
            console.error(`Failed to connect transport ${direction}`, err);
          }
        });
      });
      log(`setting ${direction} transport`, newTransport);
      dispatch({
        type: 'set-transport',
        direction,
        transport: newTransport,
      });
      return () => {
        if (!newTransport.closed) newTransport.close();
      };
    } else {
      log(`clearing ${direction} transport`);
      dispatch({
        type: 'set-transport',
        direction,
        transport: undefined,
      });
      return undefined;
    }
  }, [
    device, hasParams, transportParams?._id, direction,
    transportParams?.transportId, transportParams?.iceParameters, transportParams?.iceCandidates,
    transportParams?.dtlsParameters, dispatch,
  ]);

  return connectRef;
};

function cleanupProducerMapEntry(map: Map<string, ProducerState>, trackId: string) {
  const producerState = map.get(trackId);
  if (producerState) {
    // Stop the producer if present
    if (producerState.producer) {
      log('stopping producer for track', trackId);
      producerState.producer.close();
    }

    // Stop the producer sub if present.
    if (producerState.subHandle) {
      log('stopping producer sub for track', trackId);
      producerState.subHandle.stop();
    }

    // Drop the removed track from the producerMapRef.
    log('producerMapRef.delete', trackId);
    map.delete(trackId);
  }
}

type ProducerCallback = ({ id }: { id: string }) => void;
type ProducerState = {
  producer: types.Producer | undefined;
  subHandle: Meteor.SubscriptionHandle | undefined;
  producerServerCallback: ProducerCallback | undefined;
  kind: string | undefined;
  rtpParameters: string | undefined;
}

type ConsumerState = {
  consumer: types.Consumer | undefined;
  peerId: string;
}

const useCallState = ({ huntId, puzzleId, tabId }: {
  huntId: string,
  puzzleId: string,
  tabId: string,
}): [CallState, React.Dispatch<Action>] => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    // If huntId, puzzleId, or tabId change (but mostly puzzleId), reset
    // call state.
    return () => {
      log('huntId/puzzleId/tabId changed, resetting call state');
      dispatch({ type: 'reset' });
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
      joinSubRef.current = Meteor.subscribe('mediasoup:join', huntId, puzzleId, tabId);
    }

    return () => {
      if (joinSubRef.current) {
        joinSubRef.current.stop();
        joinSubRef.current = undefined;
      }
    };
  }, [state.callState, huntId, puzzleId, tabId]);

  const userId = useTracker(() => Meteor.userId(), []);
  const peers = useFind(() => Peers.find({ hunt: huntId, call: puzzleId }), [huntId, puzzleId]);
  const selfPeer = useMemo(() => {
    return peers.find((peer) => peer.createdBy === userId && peer.tab === tabId);
  }, [peers, tabId, userId]);
  const otherPeers = useMemo(
    () => peers.filter((p) => p._id !== selfPeer?._id),
    [peers, selfPeer?._id]
  );
  // Make sure to keep state.peers up-to-date.
  useEffect(() => {
    dispatch({ type: 'set-peers', selfPeer, otherPeers });
  }, [selfPeer, otherPeers]);
  const router = useTracker(() => Routers.findOne({ call: puzzleId }), [puzzleId]);
  useEffect(() => {
    dispatch({ type: 'set-router', router });
  }, [router]);

  // Once we have the Router for this room, we can create a mediasoup client device.
  // If we disconnect from the call, though, we want to make sure to get a new
  // Device for the next call.
  const device = state.device;
  useEffect(() => {
    if (router?._id) {
      void (async () => {
        console.log('Creating new Mediasoup device');
        const newDevice = new Device();
        await newDevice.load({
          routerRtpCapabilities: JSON.parse(router.rtpCapabilities),
        });
        dispatch({ type: 'set-device', device: newDevice });
      })();
    } else {
      console.log('Clearing Mediasoup device');
      dispatch({ type: 'set-device', device: undefined });
    }
  }, [router?._id, router?.rtpCapabilities]);

  const rtpCaps = device ? JSON.stringify(device.rtpCapabilities) : undefined;
  const transportSubHandle = useRef<Meteor.SubscriptionHandle | undefined>(undefined);
  useEffect(() => {
    if (!transportSubHandle.current && device && selfPeer?._id) {
      log(`subscribe mediasoup:transports ${selfPeer._id}`, rtpCaps);
      transportSubHandle.current = Meteor.subscribe('mediasoup:transports', selfPeer._id, rtpCaps);
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
      sendServerParams: hasSelfPeer ? Transports.findOne({ peer: selfPeer._id, direction: 'send' }) : undefined,
      recvServerParams: hasSelfPeer ? Transports.findOne({ peer: selfPeer._id, direction: 'recv' }) : undefined,
    };
  }, [hasSelfPeer, selfPeer?._id]);

  // We now believe we have the parameters we need to connect call transports.

  // Because our connection might be to a different server than the mediasoup
  // router is hosted on, the Meteor transport_connect call will return before
  // the connection parameters have been passed to the server-side transport.
  // Therefore, stash the acknowledgement callback on a ref and call it once the
  // corresponding ConnectAck db record is created.
  const sendTransportConnectCallback = useTransport(device, 'send', sendServerParams, dispatch);
  const recvTransportConnectCallback = useTransport(device, 'recv', recvServerParams, dispatch);
  const sendTransport = state.transports.send;
  const recvTransport = state.transports.recv;
  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (hasSelfPeer) {
      const observer = ConnectAcks.find({ peer: selfPeer._id }).observeChanges({
        added: (_id, fields) => {
          if (fields.direction === 'send') {
            sendTransportConnectCallback.current?.();
            sendTransportConnectCallback.current = undefined;
          } else if (fields.direction === 'recv') {
            recvTransportConnectCallback.current?.();
            recvTransportConnectCallback.current = undefined;
          }
        },
      });
      return () => observer.stop();
    }
    return undefined;
  }, [hasSelfPeer, selfPeer?._id, sendTransportConnectCallback, recvTransportConnectCallback]);

  // ==========================================================================
  // Producer (audio from local microphone, sending to server) logic
  // Extract the tracks from the current media source stream
  const [producerTracks, setProducerTracks] = useState<MediaStreamTrack[]>([]);
  // eslint-disable-next-line consistent-return
  useEffect(() => {
    // Use Meteor.defer here because the addtrack/removetrack events seem to
    // sometimes fire _before_ the track has actually been added to the stream's
    // track set.
    const stream = state.audioState?.mediaSource;
    if (stream) {
      const captureTracks = () => Meteor.defer(() => setProducerTracks(stream.getTracks()));
      captureTracks();
      stream.addEventListener('addtrack', captureTracks);
      stream.addEventListener('removetrack', captureTracks);
      return () => {
        stream.removeEventListener('addtrack', captureTracks);
        stream.removeEventListener('removetrack', captureTracks);
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
  const [producerParamsGeneration, setProducerParamsGeneration] = useState<number>(0);

  // Once we have a ready producer (or producers), we want to be sure that their
  // pause states and server-side mute/deafen states are all appropriately set.
  // Incremented whenever the `producer` of an entry in `producerMapRef` is written
  // to a new values.
  // Used in the deps array of the effect which pauses or resumes the producer.
  const [producerGeneration, setProducerGeneration] = useState<number>(0);

  const onProduce = useCallback((
    { kind, rtpParameters, appData }: {
      kind: string,
      rtpParameters: types.RtpParameters,
      appData: any,
    },
    callback: ProducerCallback,
  ) => {
    log(`onProduce(kind=${kind}, track id=${appData.trackId})`);
    // extract track Id from app data
    const producerState = producerMapRef.current.get(appData.trackId);
    if (!producerState) {
      console.error(`got onProduce callback for ${appData.trackId} but found no producer state`);
    } else {
      producerState.kind = kind;
      producerState.rtpParameters = JSON.stringify(rtpParameters);
      producerState.producerServerCallback = callback;
      setProducerParamsGeneration((prevValue) => (prevValue + 1));
    }
  }, []);
  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (sendTransport) {
      sendTransport?.on('produce', onProduce);
      return () => {
        sendTransport?.off('produce', onProduce);
      };
    }
    return undefined;
  }, [sendTransport, onProduce]);

  useEffect(() => {
    const observer = ProducerServers.find().observeChanges({
      added: (_id, fields) => {
        log(`ProducerServers added ${_id}`, fields);
        const trackId = fields.trackId;
        if (!trackId) {
          console.error('Expected trackId in', _id, fields);
          return;
        }
        const producerState = producerMapRef.current.get(trackId);
        if (producerState?.producerServerCallback) {
          log(`Calling producerServerCallback(id: ${fields.producerId})`);
          producerState.producerServerCallback({ id: fields.producerId! });
          producerState.producerServerCallback = undefined;
          log('%cOutbound track live', 'color: green; background: yellow;');
        }
      },
    });
    return () => observer.stop();
  }, []);

  useEffect(() => {
    log('producerTracks', producerTracks.map((t) => t.id));
    const activeTrackIds = new Set();
    producerTracks.forEach((track) => {
      activeTrackIds.add(track.id);
      // Subscribe if no sub created yet

      if (sendTransport) {
        let producerState = producerMapRef.current.get(track.id);
        if (!producerState) {
          // Create empty entry, before we attempt to produce for the track
          producerState = {
            producer: undefined,
            subHandle: undefined,
            producerServerCallback: undefined,
            kind: undefined,
            rtpParameters: undefined,
          };
          producerMapRef.current.set(track.id, producerState);
          console.log('Creating Mediasoup producer', { track: track.id });
          // Tell the mediasoup library to produce a stream from this track.
          void (async () => {
            const newProducer = await sendTransport.produce({
              track,
              zeroRtpOnPause: true,
              appData: { trackId: track.id },
            });
            log('got producer', newProducer);
            const entry = producerMapRef.current.get(track.id);
            if (entry) {
              entry.producer = newProducer;
            } else {
              console.error(`no entry in producerMapRef for ${track.id}`);
            }
            setProducerGeneration((prevValue) => prevValue + 1);
          })();
        }

        if (!producerState.subHandle && producerState.kind &&
          producerState.rtpParameters) {
          // Indicate intent to produce to the backend.
          log(`subscribe mediasoup:producer tp=${sendTransport.appData._id} track=${track.id} kind=${producerState.kind}`);
          producerState.subHandle = Meteor.subscribe('mediasoup:producer', sendTransport.appData._id, track.id, producerState.kind, producerState.rtpParameters);
        }
      }
    });

    // Drop any producers for tracks that are no longer in producerTracks.
    producerMapRef.current.forEach((_producerState, trackId) => {
      if (!activeTrackIds.has(trackId)) {
        cleanupProducerMapEntry(producerMapRef.current, trackId);
      }
    });
  }, [sendTransport, producerTracks, producerParamsGeneration]);

  // Ensure mute state is respected by mediasoup.
  const producerShouldBePaused = state.audioControls?.muted || state.audioControls?.deafened;
  useEffect(() => {
    if (producerShouldBePaused !== undefined) {
      // Update producer pause state
      producerTracks.forEach((track) => {
        const producer = producerMapRef.current.get(track.id)?.producer;
        if (producer && (producerShouldBePaused !== producer.paused)) {
          if (producerShouldBePaused) {
            // eslint-disable-next-line no-param-reassign
            track.enabled = false;
            log('pausing producer for track', track.id);
            producer.pause();
          } else {
            // eslint-disable-next-line no-param-reassign
            track.enabled = true;
            log('resuming producer for track', track.id);
            producer.resume();
          }
          mediasoupSetProducerPaused.call({
            mediasoupProducerId: producer.id,
            paused: producerShouldBePaused,
          }, (err) => {
            if (err) {
              console.error("Couldn't tell backend we've paused producer", track.id, err);
            }
          });
        }
      });
    }
  }, [producerTracks, producerShouldBePaused, producerGeneration]);

  // Ensure we update peer state so that mute/deafen are visible to others.
  useEffect(() => {
    const audioControls = state.audioControls;
    if (selfPeer && audioControls) {
      const serverEffectiveState = participantState(selfPeer.muted, selfPeer.deafened);
      const localEffectiveState = participantState(audioControls.muted, audioControls.deafened);
      if (serverEffectiveState !== localEffectiveState) {
        mediasoupSetPeerState.call({ peerId: selfPeer._id, state: localEffectiveState }, (err) => {
          if (err) {
            console.error(`Couldn't set peer state for ${selfPeer._id} to ${localEffectiveState}`, err);
          }
        });
      }
    }
  }, [selfPeer, state.audioControls?.muted, state.audioControls?.deafened, state.audioControls]);

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
  const puzzleConsumers = useFind(
    () => Consumers.find({ call: puzzleId }, { sort: { _id: 1 } }),
    [puzzleId]
  );
  const groupedConsumers = useMemo(() => {
    return groupedBy(puzzleConsumers, (consumer) => consumer.producerPeer);
  }, [puzzleConsumers]);

  // Map from consumer._id to our working state for that consumer.
  const consumerMapRef = useRef<Map<string, ConsumerState>>(new Map());

  const cleanupConsumer = useCallback((meteorId, consumerState) => {
    // Drop it.
    if (consumerState.consumer) {
      log('Stopping consumer', meteorId);
      consumerState.consumer.close();
      dispatch({ type: 'remove-peer-track', peerId: consumerState.peerId, track: consumerState.consumer.track });
    }

    // Delete it.
    log('consumerMapRef delete', meteorId);
    consumerMapRef.current.delete(meteorId);
  }, []);

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
              log('consumers', consumerMapRef.current);
              // Create a new Mediasoup consumer
              void (async () => {
                console.log('Creating new Mediasoup consumer', { mediasoupConsumerId, producerId });
                const newConsumer = await recvTransport.consume({
                  id: mediasoupConsumerId,
                  producerId,
                  kind,
                  rtpParameters: JSON.parse(rtpParameters),
                });
                log('new consumer:', newConsumer);
                const entry = consumerMapRef.current.get(consumer._id);
                if (entry) {
                  // Save on the ref so we can clean it up later if needed.
                  entry.consumer = newConsumer;
                  // Push the track into state.
                  dispatch({ type: 'add-peer-track', peerId: peer._id, track: newConsumer.track });
                  mediasoupAckConsumer.call({ consumerId: meteorConsumerId }, (err) => {
                    if (err) {
                      console.error(`Couldn't ack consumer: _id: ${meteorConsumerId} consumerId: ${mediasoupConsumerId}`, err);
                    }
                  });
                } else {
                  console.error(`Created Mediasoup consumer for ${consumer._id} but id not in consumer map`);
                }
              })();
            }

            const consumerState = consumerMapRef.current.get(consumer._id);
            if (consumerState && consumerState.consumer) {
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
    state.callState, recvTransport, otherPeers, puzzleConsumers, groupedConsumers, cleanupConsumer,
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

  return [state, dispatch];
};

export default useCallState;
