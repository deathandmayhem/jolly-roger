/* eslint-disable no-console */
import { Meteor } from 'meteor/meteor';
import { useTracker, useSubscribe, useFind } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Device, types } from 'mediasoup-client';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import styled from 'styled-components';
import Flags from '../../Flags';
import MeteorUsers from '../../lib/models/MeteorUsers';
import ConnectAcks from '../../lib/models/mediasoup/ConnectAcks';
import Consumers from '../../lib/models/mediasoup/Consumers';
import Peers from '../../lib/models/mediasoup/Peers';
import ProducerServers from '../../lib/models/mediasoup/ProducerServers';
import Routers from '../../lib/models/mediasoup/Routers';
import Transports from '../../lib/models/mediasoup/Transports';
import { ConsumerType } from '../../lib/schemas/mediasoup/Consumer';
import { PeerType } from '../../lib/schemas/mediasoup/Peer';
import { RouterType } from '../../lib/schemas/mediasoup/Router';
import { TransportType } from '../../lib/schemas/mediasoup/Transport';
import mediasoupAckConsumer from '../../methods/mediasoupAckConsumer';
import mediasoupConnectTransport from '../../methods/mediasoupConnectTransport';
import mediasoupSetProducerPaused from '../../methods/mediasoupSetProducerPaused';
import { trace } from '../tracing';
import Avatar from './Avatar';
import Loading from './Loading';
import Spectrum from './Spectrum';
import {
  AVActions,
  AVButton,
  ChatterSubsection, ChatterSubsectionHeader, PeopleItemDiv, PeopleListDiv,
} from './styling/PeopleComponents';

const CallStateIcon = styled.span`
  font-size: 12px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: red; // TODO: lift $danger from react-bootstrap somehow?
  position: absolute;
  right: 0;
`;

const MutedIcon = styled(CallStateIcon)`
  top: 0;
`;

const DeafenedIcon = styled(CallStateIcon)`
  bottom: 0;
`;

// If we're waiting for a particular piece of server state for more than 1s,
// something might be wrong so throw up a warning
const JoiningCall = ({ details }: { details?: string }) => {
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handle = Meteor.setTimeout(() => setShowAlert(true), 1000);
    return () => Meteor.clearTimeout(handle);
  }, []);

  if (!showAlert) {
    return null;
  }

  return (
    <Alert variant="warning">
      <p>
        <Loading inline />
        Waiting for server to confirm your connection. This can happen if a new version of Jolly
        Roger was just deployed or if one of our servers failed. It should recover on its own
        shortly, but if not try leaving and rejoining the call.
      </p>

      {details && (
        <p>
          Details:
          {' '}
          {details}
        </p>
      )}
    </Alert>
  );
};

type ProducerCallback = ({ id }: { id: string }) => void;

const ProducerManager = ({
  muted,
  track,
  transport,
}: {
  muted: boolean;
  track: MediaStreamTrack;
  transport: types.Transport;
}) => {
  const [dupedTrack, setDupedTrack] = useState<MediaStreamTrack>();
  useEffect(() => {
    setDupedTrack(track.clone());
  }, [track]);

  const [producer, setProducer] = useState<types.Producer>();
  useEffect(() => {
    return () => {
      producer?.close();
    };
  }, [producer]);

  const [producerParams, setProducerParams] = useState<[string, string]>();
  const producerServerCallback = useRef<ProducerCallback>();

  useEffect(() => {
    if (producer && muted !== producer.paused) {
      producer[muted ? 'pause' : 'resume']();
      mediasoupSetProducerPaused.call({
        mediasoupProducerId: producer.id,
        paused: muted,
      });
    }
  }, [muted, producer]);

  const onProduce = useCallback((
    { kind, rtpParameters, appData }: {
      kind: string,
      rtpParameters:
      types.RtpParameters,
      appData: any,
    },
    callback: ProducerCallback,
  ) => {
    if (dupedTrack?.id !== appData.trackId) {
      return;
    }

    producerServerCallback.current = callback;
    setProducerParams([kind, JSON.stringify(rtpParameters)]);
  }, [dupedTrack?.id]);
  useEffect(() => {
    transport.on('produce', onProduce);
    return () => {
      transport.off('produce', onProduce);
    };
  }, [transport, onProduce]);

  useEffect(() => {
    const observer = ProducerServers.find({ trackId: dupedTrack?.id }).observeChanges({
      added: (_id, fields) => {
        producerServerCallback.current?.({ id: fields.producerId! });
        producerServerCallback.current = undefined;
      },
    });
    return () => observer.stop();
  }, [dupedTrack?.id]);

  useEffect(() => {
    if (!dupedTrack) {
      return;
    }
    void (async () => {
      console.log('Creating Mediasoup producer', { track: dupedTrack.id });
      // transport.produce will emit a 'produce' event before it resolves,
      // triggering onProduce above
      const newProducer = await transport.produce({
        track: dupedTrack,
        zeroRtpOnPause: true,
        appData: { trackId: dupedTrack.id },
      });
      setProducer(newProducer);
    })();
  }, [transport, dupedTrack]);

  useSubscribe(producerParams ? 'mediasoup:producer' : undefined, transport.appData._id, dupedTrack?.id, ...(producerParams ?? []));

  return null;
};

const ProducerBox = ({
  muted,
  deafened,
  audioContext,
  stream,
  transport,
  popperBoundaryRef,
}: {
  muted: boolean,
  deafened: boolean,
  audioContext: AudioContext,
  stream: MediaStream,
  transport: types.Transport,
  popperBoundaryRef: React.RefObject<HTMLElement>,
}) => {
  const spectraDisabled = useTracker(() => Flags.active('disable.spectra'));
  const { userId, name, discordAccount } = useTracker(() => {
    const user = Meteor.user()!;
    return {
      userId: user._id,
      name: user.displayName,
      discordAccount: user.discordAccount,
    };
  });

  const [tracks, setTracks] = useState<MediaStreamTrack[]>([]);
  useEffect(() => {
    // Use Meteor.defer here because the addtrack/removetrack events seem to
    // sometimes fire _before_ the track has actually been added to the stream's
    // track set.
    const captureTracks = () => Meteor.defer(() => setTracks(stream.getTracks()));
    captureTracks();
    stream.addEventListener('addtrack', captureTracks);
    stream.addEventListener('removetrack', captureTracks);
    return () => {
      stream.removeEventListener('addtrack', captureTracks);
      stream.removeEventListener('removetrack', captureTracks);
    };
  }, [stream]);

  return (
    <OverlayTrigger
      placement="bottom"
      popperConfig={{
        modifiers: [
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              boundary: popperBoundaryRef.current,
              padding: 0,
            },
          },
        ],
      }}
      overlay={(
        <Tooltip id="caller-self">
          <div>You are in the call.</div>
          {muted && <div>You are currently muted and will transmit no audio.</div>}
          {deafened && <div>You are currently deafened and will hear no audio.</div>}
        </Tooltip>
      )}
    >
      <PeopleItemDiv>
        <Avatar _id={userId} displayName={name} discordAccount={discordAccount} size={40} />
        <div>
          {muted && <MutedIcon><FontAwesomeIcon icon={faMicrophoneSlash} /></MutedIcon>}
          {deafened && <DeafenedIcon><FontAwesomeIcon icon={faVolumeMute} /></DeafenedIcon>}
          {!spectraDisabled && !muted && !deafened ? (
            <Spectrum
              width={40}
              height={40}
              audioContext={audioContext}
              stream={stream}
            />
          ) : null}
        </div>
        {tracks.map((track) => (
          <ProducerManager
            key={track.id}
            muted={muted}
            track={track}
            transport={transport}
          />
        ))}
      </PeopleItemDiv>
    </OverlayTrigger>
  );
};

const ConsumerManager = ({
  setTrack,
  recvTransport,
  serverConsumer,
}: {
  setTrack: (consumer: string, track?: MediaStreamTrack) => void;
  recvTransport: types.Transport,
  serverConsumer: ConsumerType,
}) => {
  const [consumer, setConsumer] = useState<types.Consumer>();
  useEffect(() => {
    setTrack(serverConsumer._id, consumer?.track);
    return () => setTrack(serverConsumer._id, undefined);
  }, [serverConsumer._id, consumer?.track, setTrack]);

  const {
    _id: meteorConsumerId,
    consumerId: mediasoupConsumerId,
    producerId,
    kind,
    rtpParameters,
    paused,
  } = serverConsumer;

  useEffect(() => {
    if (!consumer) {
      return;
    }

    if (paused) {
      consumer.pause();
    } else {
      consumer.resume();
    }
  }, [consumer, paused]);

  useEffect(() => {
    void (async () => {
      console.log('Creating new Mediasoup consumer', { mediasoupConsumerId, producerId });
      const newConsumer = await recvTransport.consume({
        id: mediasoupConsumerId,
        producerId,
        kind,
        rtpParameters: JSON.parse(rtpParameters),
      });
      setConsumer(newConsumer);
      mediasoupAckConsumer.call({ consumerId: meteorConsumerId });
    })();
  }, [meteorConsumerId, mediasoupConsumerId, producerId, kind, rtpParameters, recvTransport]);

  // Use a separate useEffect here since the above will return before the promise resolves
  useEffect(() => {
    return () => consumer?.close();
  }, [consumer]);

  return null;
};

const ChatterTooltip = styled(Tooltip)`
  // Force chatter tooltip overlay to get larger than the default
  // react-bootstrap stylesheet permits.  We can only apply classes to the root
  // tooltip <div>; the .tooltip-inner className is controlled by
  // react-bootstrap/popper.
  .tooltip-inner {
    max-width: 300px;
  }
`;

const PeerBox = ({
  audioContext,
  selfDeafened,
  recvTransport,
  peer,
  consumers,
  popperBoundaryRef,
}: {
  audioContext: AudioContext,
  selfDeafened: boolean,
  recvTransport: types.Transport,
  peer: PeerType,
  consumers: ConsumerType[],
  popperBoundaryRef: React.RefObject<HTMLElement>,
}) => {
  const spectraDisabled = useTracker(() => Flags.active('disable.spectra'));
  const { userId, name, discordAccount } = useTracker(() => {
    const user = MeteorUsers.findOne(peer.createdBy);
    return {
      userId: user?._id,
      name: user?.displayName,
      discordAccount: user?.discordAccount,
    };
  }, [peer.createdBy]);

  const { current: stream } = useRef(new MediaStream());

  const [tracks, setTracks] = useState<Map<string, MediaStreamTrack>>(new Map());
  const setTrack = useCallback((consumer: string, track?: MediaStreamTrack) => {
    setTracks((prevTracks) => {
      const prevTrack = prevTracks.get(consumer);
      const newTracks = new Map(prevTracks);

      if (prevTrack) {
        stream.removeTrack(prevTrack);
        newTracks.delete(consumer);
      }
      if (track) {
        stream.addTrack(track);
        newTracks.set(consumer, track);
      }

      return newTracks;
    });
  }, [stream]);

  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && tracks.size > 0) {
      audioRef.current.srcObject = stream;
    }
  }, [tracks, stream]);

  const { muted, deafened } = peer;

  return (
    <OverlayTrigger
      placement="bottom"
      popperConfig={{
        modifiers: [
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              boundary: popperBoundaryRef.current,
              padding: 0,
            },
          },
        ],
      }}
      overlay={(
        <ChatterTooltip id={`caller-${peer._id}`}>
          <div>{name}</div>
          {muted &&
            <div>Muted (no one can hear them)</div>}
          {deafened &&
            <div>Deafened (they can&apos;t hear anyone)</div>}
        </ChatterTooltip>
      )}
    >
      <PeopleItemDiv>
        <Avatar _id={userId} displayName={name} discordAccount={discordAccount} size={40} />
        <div>
          {muted && <MutedIcon><FontAwesomeIcon icon={faMicrophoneSlash} /></MutedIcon>}
          {deafened && <DeafenedIcon><FontAwesomeIcon icon={faVolumeMute} /></DeafenedIcon>}
          {!spectraDisabled && !muted && (tracks.size > 0) ? (
            <Spectrum
              width={40}
              height={40}
              audioContext={audioContext}
              stream={stream}
            />
          ) : null}
        </div>
        <audio ref={audioRef} autoPlay playsInline muted={selfDeafened} />
        {consumers.map((consumer) => (
          <ConsumerManager
            key={consumer._id}
            setTrack={setTrack}
            recvTransport={recvTransport}
            serverConsumer={consumer}
          />
        ))}
      </PeopleItemDiv>
    </OverlayTrigger>
  );
};

const Callers = ({
  puzzleId,
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  otherPeers,
  sendTransport,
  recvTransport,
}: {
  puzzleId: string,
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
  otherPeers: PeerType[];
  sendTransport: types.Transport;
  recvTransport: types.Transport;
}) => {
  const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;
  const callerCount = otherPeers.length + 1; // +1 for self
  const chatterRef = useRef<HTMLDivElement>(null);

  const consumers = useFind(
    () => Consumers.find({ call: puzzleId }, { sort: { _id: 1 } }),
    [puzzleId]
  );
  const groupedConsumers = useMemo(() => {
    return _.groupBy(consumers, (consumer) => consumer.producerPeer);
  }, [consumers]);
  const peerBoxes = otherPeers.map((peer) => {
    return (
      <PeerBox
        key={peer._id}
        selfDeafened={deafened}
        audioContext={audioContext}
        recvTransport={recvTransport}
        peer={peer}
        consumers={groupedConsumers[peer._id] ?? []}
        popperBoundaryRef={chatterRef}
      />
    );
  });

  return (
    <ChatterSubsection ref={chatterRef}>
      <ChatterSubsectionHeader onClick={onToggleCallersExpanded}>
        <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
        {`${callerCount} caller${callerCount !== 1 ? 's' : ''}`}
      </ChatterSubsectionHeader>
      <PeopleListDiv collapsed={!callersExpanded}>
        <ProducerBox
          muted={muted}
          deafened={deafened}
          audioContext={audioContext}
          stream={localStream}
          transport={sendTransport}
          popperBoundaryRef={chatterRef}
        />
        {peerBoxes}
      </PeopleListDiv>
    </ChatterSubsection>
  );
};

const useTransport = (
  device: types.Device,
  transportParams: TransportType,
) => {
  const [transport, setTransport] = useState<types.Transport>();
  const connectRef = useRef<() => void>();

  const {
    _id,
    direction,
    transportId,
    iceParameters,
    iceCandidates,
    dtlsParameters: serverDtlsParameters,
  } = transportParams;

  useEffect(() => {
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
      });
    });
    setTransport(newTransport);
    return () => {
      newTransport.close();
    };
  }, [device, _id, direction, transportId, iceParameters, iceCandidates, serverDtlsParameters]);

  return [transport, connectRef] as const;
};

const CallTransportConnector = ({
  puzzleId,
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  selfPeer,
  otherPeers,
  device,
  sendServerParams,
  recvServerParams,
  onHeightChange,
}: {
  puzzleId: string,
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
  selfPeer: PeerType;
  otherPeers: PeerType[];
  device: types.Device;
  sendServerParams: TransportType;
  recvServerParams: TransportType;
  onHeightChange(): void;
}) => {
  // Because our connection might be to a different server than the mediasoup
  // router is hosted on, the Meteor transport_connect call will return before
  // the connection parameters have been passed to the server-side transport.
  // Therefore, stash the acknowledgement callback on a ref and call it once the
  // corresponding ConnectAck db record is created.
  const [sendTransport, sendTransportConnectCallback] = useTransport(device, sendServerParams);
  const [recvTransport, recvTransportConnectCallback] = useTransport(device, recvServerParams);
  useEffect(() => {
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
  }, [selfPeer._id, sendTransportConnectCallback, recvTransportConnectCallback]);

  const notReadyYet = !sendTransport || !recvTransport;
  useLayoutEffect(() => {
    // Notify any time we might change the height of what we render
    trace('CallTransportConnector useLayoutEffect', {
      notReadyYet,
      callersExpanded,
      otherPeers: otherPeers.length,
    });
    onHeightChange();
  }, [onHeightChange, notReadyYet, callersExpanded, otherPeers.length]);

  trace('CallTransportConnector render', {
    hasSend: !!sendTransport,
    hasRecv: !!recvTransport,
    otherPeers: otherPeers.length,
  });

  if (!sendTransport || !recvTransport) {
    // No JoiningCall warning here - if we have params coming in we're
    // guaranteed to create the local transports
    return null;
  }

  return (
    <Callers
      puzzleId={puzzleId}
      muted={muted}
      deafened={deafened}
      audioContext={audioContext}
      localStream={localStream}
      callersExpanded={callersExpanded}
      onToggleCallersExpanded={onToggleCallersExpanded}
      otherPeers={otherPeers}
      sendTransport={sendTransport}
      recvTransport={recvTransport}
    />
  );
};

const CallTransportCreator = ({
  puzzleId,
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  selfPeer,
  otherPeers,
  router,
  onHeightChange,
}: {
  puzzleId: string,
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
  selfPeer: PeerType;
  otherPeers: PeerType[];
  router: RouterType;
  onHeightChange(): void;
}) => {
  const [device, setDevice] = useState<types.Device>();
  useEffect(() => {
    void (async () => {
      console.log('Creating new Mediasoup device');
      const newDevice = new Device();
      await newDevice.load({
        routerRtpCapabilities: JSON.parse(router.rtpCapabilities),
      });
      setDevice(newDevice);
    })();
  }, [router.rtpCapabilities]);

  useSubscribe(device ? 'mediasoup:transports' : undefined, selfPeer._id, JSON.stringify(device?.rtpCapabilities));
  const { sendServerParams, recvServerParams } = useTracker(() => {
    return {
      // Note that these queries don't pin to the specific TransportRequest
      // created by the subscription above, so for some reason we delete and
      // recreate that subscription, we might transiently see the old Transports
      // instead of the current ones. As the old subscription is torn down, the
      // old Transports will be deleted as well, so this should converge on its
      // own.
      sendServerParams: Transports.findOne({ peer: selfPeer._id, direction: 'send' }),
      recvServerParams: Transports.findOne({ peer: selfPeer._id, direction: 'recv' }),
    };
  }, [selfPeer._id]);

  const hasDevice = !!device;
  useLayoutEffect(() => {
    trace('CallSection useLayoutEffect', {
      hasDevice,
      sendId: sendServerParams?._id,
      recvId: recvServerParams?._id,
    });
    onHeightChange();
  }, [onHeightChange, hasDevice, sendServerParams?._id, recvServerParams?._id]);

  trace('CallSection render', {
    hasDevice,
    sendServerParams,
    recvServerParams,
  });

  if (!device) {
    return null;
  }

  if (!sendServerParams || !recvServerParams) {
    return <JoiningCall details="Missing transport parameters" />;
  }

  return (
    <CallTransportConnector
      puzzleId={puzzleId}
      muted={muted}
      deafened={deafened}
      audioContext={audioContext}
      localStream={localStream}
      callersExpanded={callersExpanded}
      onToggleCallersExpanded={onToggleCallersExpanded}
      selfPeer={selfPeer}
      otherPeers={otherPeers}
      device={device}
      sendServerParams={sendServerParams}
      recvServerParams={recvServerParams}
      onHeightChange={onHeightChange}
    />
  );
};

const CallJoiner = ({
  huntId,
  puzzleId,
  tabId,
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  onHeightChange,
}: {
  huntId: string;
  puzzleId: string;
  tabId: string;
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
  onHeightChange(): void;
}) => {
  useSubscribe('mediasoup:join', huntId, puzzleId, tabId);

  const userId = useTracker(() => Meteor.userId(), []);
  const peers = useFind(() => Peers.find({ call: puzzleId }));
  const selfPeer = useMemo(() => {
    return peers.find((peer) => peer.createdBy === userId && peer.tab === tabId);
  }, [peers, tabId, userId]);
  const otherPeers = useMemo(
    () => peers.filter((p) => p._id !== selfPeer?._id),
    [peers, selfPeer?._id]
  );
  const router = useTracker(() => Routers.findOne({ call: puzzleId }), [puzzleId]);

  useLayoutEffect(() => {
    // We might change height when showing the JoiningCall message
    onHeightChange();
  }, [onHeightChange, selfPeer, router]);

  if (!selfPeer) {
    return <JoiningCall details="Missing peer record for self" />;
  }
  if (!router) {
    return <JoiningCall details="Missing router" />;
  }

  return (
    <CallTransportCreator
      puzzleId={puzzleId}
      muted={muted}
      deafened={deafened}
      audioContext={audioContext}
      localStream={localStream}
      callersExpanded={callersExpanded}
      onToggleCallersExpanded={onToggleCallersExpanded}
      selfPeer={selfPeer}
      otherPeers={otherPeers}
      router={router}
      onHeightChange={onHeightChange}
    />
  );
};

const CallSection = ({
  huntId,
  puzzleId,
  tabId,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onLeaveCall,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  onHeightChange,
}: {
  huntId: string;
  puzzleId: string;
  tabId: string;
  muted: boolean;
  deafened: boolean;
  onToggleMute(): void;
  onToggleDeafen(): void;
  onLeaveCall(): void;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
  onHeightChange(): void;
}) => {
  return (
    <>
      <AVActions>
        <AVButton
          variant={muted ? 'secondary' : 'light'}
          size="sm"
          onClick={onToggleMute}
        >
          {muted ? 'Un\u00ADmute' : 'Mute self'}
        </AVButton>
        <AVButton
          variant={deafened ? 'secondary' : 'light'}
          size="sm"
          onClick={onToggleDeafen}
        >
          {deafened ? 'Un\u00ADdeafen' : 'Deafen self'}
        </AVButton>
        <AVButton variant="danger" size="sm" onClick={onLeaveCall}>Leave call</AVButton>
      </AVActions>
      <CallJoiner
        huntId={huntId}
        puzzleId={puzzleId}
        tabId={tabId}
        muted={muted}
        deafened={deafened}
        audioContext={audioContext}
        localStream={localStream}
        callersExpanded={callersExpanded}
        onToggleCallersExpanded={onToggleCallersExpanded}
        onHeightChange={onHeightChange}
      />
    </>
  );
};

export default CallSection;
