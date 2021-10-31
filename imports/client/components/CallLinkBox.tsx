import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import { getAvatarCdnUrl } from '../../lib/discord';
import CallSignals from '../../lib/models/call_signals';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participant';
import { CallSignalType, CallSignalMessageType } from '../../lib/schemas/call_signals';
import { ProfileType } from '../../lib/schemas/profiles';
import { RTCConfigType } from '../rtc_config';
import Spectrum, { SpectrumHandle } from './Spectrum';

interface CallLinkBoxProps {
  rtcConfig: RTCConfigType;
  selfParticipant: CallParticipantType;
  peerParticipant: CallParticipantType;
  localStream: MediaStream;
  audioContext: AudioContext;
  deafened: boolean;
}

interface CallLinkBoxTracker {
  signal: CallSignalType | undefined;
  peerProfile: ProfileType | undefined;
  spectraDisabled: boolean;
}

const CallLinkBox = (props: CallLinkBoxProps) => {
  const {
    rtcConfig: rtcConfigProps,
    selfParticipant,
    peerParticipant,
    localStream,
    audioContext,
    deafened,
  } = props;

  const tracker = useTracker<CallLinkBoxTracker>(() => {
    const signal = CallSignals.findOne({
      sender: peerParticipant._id,
      target: selfParticipant._id,
    });

    // Subscription for Profiles is provided by ChatPeople.
    const peerProfile = Profiles.findOne(peerParticipant.createdBy);
    const spectraDisabled = Flags.active('disable.spectra');

    return {
      signal,
      peerProfile,
      spectraDisabled,
    };
  }, [selfParticipant, peerParticipant]);

  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const audioRef = useRef<HTMLVideoElement | null>(null);
  const spectrumRef = useRef<SpectrumHandle | null>(null);
  const spectrumStreamRef = useRef<MediaStream | undefined>(undefined);
  const remoteStream = useRef<MediaStream>(new MediaStream());
  const prevSignalsProcessed = useRef<number>(0);

  const { username, credential, urls } = rtcConfigProps;
  const rtcConfig = useMemo(() => {
    return {
      iceServers: [
        {
          username,
          credential,
          urls,
        },
      ],
    };
  }, [username, credential, urls]);

  const isInitiator = selfParticipant._id < peerParticipant._id;

  const peerConnectionRef = useRef<RTCPeerConnection | undefined>(undefined);
  const getPeerConnection = useCallback((): RTCPeerConnection => {
    if (!peerConnectionRef.current) {
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
    }
    return peerConnectionRef.current;
  }, [rtcConfig]);

  const log = useCallback((...args: any) => {
    // eslint-disable-next-line no-console
    console.log(peerParticipant._id, ...args);
  }, [peerParticipant._id]);

  const onAnswerCreated = useCallback((answer: RTCSessionDescriptionInit) => {
    // log('onAnswerCreated', answer);
    getPeerConnection().setLocalDescription(answer);
    const answerObj = {
      type: answer.type,
      sdp: answer.sdp,
    };
    Meteor.call('signalPeer', selfParticipant._id, peerParticipant._id, { type: 'sdp', content: JSON.stringify(answerObj) });
  }, [selfParticipant._id, peerParticipant._id, getPeerConnection]);

  const onAnswerCreatedFailure = useCallback((err: DOMException) => {
    log('onAnswerCreatedFailure', err);
  }, [log]);

  const onRemoteDescriptionSet = useCallback(() => {
    // log('remoteDescriptionSet');
    if (!isInitiator) {
      const pc = getPeerConnection();
      pc.createAnswer()
        .then(onAnswerCreated)
        .catch(onAnswerCreatedFailure);
    }
  }, [isInitiator, getPeerConnection, onAnswerCreated, onAnswerCreatedFailure]);

  const onRemoteDescriptionSetFailure = useCallback((err: Error) => {
    log('remoteDescriptionSetFailure', err);
  }, [log]);

  const handleSignal = useCallback((message: CallSignalMessageType) => {
    const pc = getPeerConnection();
    if (message.type === 'sdp') {
      // log('handle sdp');
      // Create an RTCSessionDescription using the received SDP offer.
      // Set it.  In the callback, create an answer, then set that as
      // the local description, then signal the initiator.
      const sdpDesc = JSON.parse(message.content);
      pc.setRemoteDescription(sdpDesc)
        .then(onRemoteDescriptionSet)
        .catch(onRemoteDescriptionSetFailure);
    } else if (message.type === 'iceCandidate') {
      // log('handle ice', message.content);
      const iceDesc = JSON.parse(message.content);
      if (iceDesc) {
        const remoteCandidate = new RTCIceCandidate(iceDesc);
        // TODO: error handling
        pc.addIceCandidate(remoteCandidate);
      } else {
        log('all candidates received');
      }
    } else {
      log('dunno what this message is:', message);
    }
  }, [onRemoteDescriptionSet, onRemoteDescriptionSetFailure, getPeerConnection, log]);

  const processSignalMessages = useCallback((
    messages: CallSignalMessageType[], previouslyProcessed: number
  ) => {
    const len = messages.length;
    for (let i = previouslyProcessed; i < len; i++) {
      // log(`signal ${i}: ${JSON.stringify(messages[i])}`);
      handleSignal(messages[i]);
    }
  }, [handleSignal]);

  const onNewLocalCandidate = useCallback((e: RTCPeerConnectionIceEvent) => {
    const iceCandidate = e.candidate;
    if (!iceCandidate) {
      log('local candidate list complete');
    }

    Meteor.call('signalPeer',
      selfParticipant._id,
      peerParticipant._id,
      { type: 'iceCandidate', content: JSON.stringify(iceCandidate) });
  }, [selfParticipant._id, peerParticipant._id, log]);

  const onIceConnectionStateChange = useCallback((_e: Event) => {
    // log('new ice connection state change:');
    // log(e);
    setIceConnectionState(getPeerConnection().iceConnectionState);
  }, [getPeerConnection]);

  const connectSpectrogramIfReady = useCallback(() => {
    // Connect the stream to the spectrogram if ready.
    if (spectrumRef.current && spectrumStreamRef.current) {
      spectrumRef.current.connect(spectrumStreamRef.current);
    }
  }, []);

  const onNewRemoteTrack = useCallback((e: RTCTrackEvent) => {
    log('newRemoteTrack', e);
    if (e.track.kind === 'audio') {
      // Wire the track directly to the audio element for playback with echo
      // cancellation.
      remoteStream.current.addTrack(e.track);

      // Save a copy of the spectrum stream to feed the spectrogram when applicable.
      const spectrumStream = new MediaStream();
      spectrumStream.addTrack(e.track);
      spectrumStreamRef.current = spectrumStream;

      // Connect the stream to the spectrogram if both are ready.
      connectSpectrogramIfReady();
    } else {
      // Ignore non-audio tracks.
      // remoteStream.current.addTrack(e.track);
    }

    if (audioRef.current) {
      audioRef.current.srcObject = remoteStream.current;
    }
  }, [connectSpectrogramIfReady, log]);

  const onLocalOfferCreated = useCallback((offer: RTCSessionDescriptionInit) => {
    // log('onLocalOfferCreated');
    // log(offer);
    getPeerConnection().setLocalDescription(offer);
    const offerObj = {
      type: offer.type,
      sdp: offer.sdp,
    };
    Meteor.call('signalPeer', selfParticipant._id, peerParticipant._id, { type: 'sdp', content: JSON.stringify(offerObj) });
  }, [selfParticipant._id, peerParticipant._id, getPeerConnection]);

  const onNegotiationNeeded = useCallback((_e: Event) => {
    // If we're the initiator, get the ball rolling.  Create an
    // offer, so we'll:
    // 1) generate an SDP descriptor and
    // 2) start doing STUN to collect our ICE candidates.
    //
    // We must make the offer *after* we have a user media stream;
    // browsers won't bother if the peer doesn't have a stream worth
    // sharing, because SDP requires knowing what the stream format
    // is.  (This is fine; we already have the stream by the time we
    // construct a CallLink.)
    if (isInitiator) {
      getPeerConnection().createOffer().then(onLocalOfferCreated);
    }

    // log('negotiationNeeded', e);
  }, [isInitiator, getPeerConnection, onLocalOfferCreated]);

  useEffect(() => {
    const pc = getPeerConnection();
    pc.addEventListener('icecandidate', onNewLocalCandidate);
    return () => {
      pc.removeEventListener('icecandidate', onNewLocalCandidate);
    };
  }, [getPeerConnection, onNewLocalCandidate]);

  useEffect(() => {
    const pc = getPeerConnection();
    // Firefox doesn't support connectionstatechange or connectionState yet, so
    // just rely on iceConnectionState for now.
    pc.addEventListener('iceconnectionstatechange', onIceConnectionStateChange);
    return () => {
      pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange);
    };
  }, [getPeerConnection, onIceConnectionStateChange]);

  useEffect(() => {
    const pc = getPeerConnection();
    pc.addEventListener('track', onNewRemoteTrack);
    return () => {
      pc.removeEventListener('track', onNewRemoteTrack);
    };
  }, [getPeerConnection, onNewRemoteTrack]);

  useEffect(() => {
    const pc = getPeerConnection();
    pc.addEventListener('negotiationneeded', onNegotiationNeeded);
    return () => {
      pc.removeEventListener('negotiationneeded', onNegotiationNeeded);
    };
  }, [getPeerConnection, onNegotiationNeeded]);

  useEffect(() => {
    // If tracker.signal.messages changes, process any new messages we got.
    if (tracker.signal) {
      // log(`signals: processing ${tracker.signal.messages.length} initial signals`);
      processSignalMessages(tracker.signal.messages, prevSignalsProcessed.current);
      // And save our index in the signals array, so we pick up where we left off.
      prevSignalsProcessed.current = tracker.signal.messages.length;
    }
  }, [tracker.signal, processSignalMessages]);

  const showSpectrum = !tracker.spectraDisabled && !peerParticipant.muted;
  useEffect(() => {
    connectSpectrogramIfReady();
  }, [connectSpectrogramIfReady, showSpectrum]);

  const spectrumRefCallback = useCallback((spectrum) => {
    spectrumRef.current = spectrum;
    if (spectrum) {
      connectSpectrogramIfReady();
    }
  }, [connectSpectrogramIfReady]);

  useEffect(() => {
    // On mount, add the local stream to the peer connection.
    const pc = getPeerConnection();

    // Add stream to RTCPeerConnection for self.
    const tracks = localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      // log(track, localStream);
      pc.addTrack(track);
    }

    // Close peer connection on unmount.
    return () => {
      pc.close();
    };
  }, [getPeerConnection, localStream]);

  const name = (tracker.peerProfile && tracker.peerProfile.displayName) || 'no profile wat';
  const discordAccount = tracker.peerProfile && tracker.peerProfile.discordAccount;
  const discordAvatarUrl = discordAccount ? getAvatarCdnUrl(discordAccount) : undefined;
  return (
    <OverlayTrigger
      key={`viewer-${peerParticipant._id}`}
      placement="right"
      overlay={(
        <Tooltip
          id={`caller-${peerParticipant._id}`}
          className="chatter-tooltip"
        >
          <div>{name}</div>
          <div>
            connection status:
            {' '}
            {iceConnectionState}
          </div>
          {peerParticipant.muted &&
            <div>Muted (no one can hear them)</div>}
          {peerParticipant.deafened &&
            <div>Deafened (they can&apos;t hear anyone)</div>}
        </Tooltip>
      )}
    >
      <div
        key={`viewer-${peerParticipant._id}`}
        className={classnames('people-item', {
          muted: peerParticipant.muted,
          deafened: peerParticipant.deafened,
          live: !peerParticipant.muted && !peerParticipant.deafened,
        })}
      >
        {discordAvatarUrl ? (
          <img
            alt={`${name}'s Discord avatar`}
            className="discord-avatar"
            src={discordAvatarUrl}
          />
        ) : (
          <span className="initial">{name.slice(0, 1)}</span>
        )}
        <div className="webrtc">
          {peerParticipant.muted && <span className="icon muted-icon"><FontAwesomeIcon icon={faMicrophoneSlash} /></span>}
          {peerParticipant.deafened && <span className="icon deafened-icon"><FontAwesomeIcon icon={faVolumeMute} /></span>}
          {showSpectrum ? (
            <Spectrum
              className="spectrogram"
              width={40}
              height={40}
              audioContext={audioContext}
              ref={spectrumRefCallback}
            />
          ) : null}
          <span className={`connection ${iceConnectionState}`} />
        </div>
        <audio ref={audioRef} className="audio-sink" autoPlay playsInline muted={deafened} />
      </div>
    </OverlayTrigger>
  );
};

export default CallLinkBox;
