import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { faMicrophone, faHeadphonesAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import CallSignals from '../../lib/models/call_signals';
import Profiles from '../../lib/models/profiles';
import PublicSettings from '../../lib/models/public_settings';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { CallSignalType, CallSignalMessageType } from '../../lib/schemas/call_signals';
import { ProfileType } from '../../lib/schemas/profiles';
import Spectrum from './Spectrum';

interface CallLinkBoxState {
  iceConnectionState: RTCIceConnectionState;
}

interface CallLinkBoxParams {
  selfParticipant: CallParticipantType;
  peerParticipant: CallParticipantType;
  localStream: MediaStream;
  audioContext: AudioContext;
  deafened: boolean;
}

interface CallLinkBoxProps extends CallLinkBoxParams {
  signal: CallSignalType | undefined;
  peerProfile: ProfileType | undefined;
  turnServerUrls: string[];
  spectraDisabled: boolean;
}

class CallLinkBox extends React.PureComponent<CallLinkBoxProps, CallLinkBoxState> {
  private audioRef: React.RefObject<HTMLVideoElement>;

  private spectrumRef: React.RefObject<Spectrum>;

  private remoteStream: MediaStream;

  private pc: RTCPeerConnection;

  private isInitiator: boolean;

  constructor(props: CallLinkBoxProps) {
    super(props);

    this.state = {
      iceConnectionState: 'new',
    };

    // Create a ref so we can get at the audio element on the page to set its
    // srcObject.
    this.audioRef = React.createRef();

    // Create a ref for the canvas for us to use to paint the spectrogram on
    this.spectrumRef = React.createRef();

    // Create a stream object to populate tracks into as we receive them from
    // our peer.
    this.remoteStream = new MediaStream();

    const rtcConfig = {
      iceServers: [
        // Example:
        // { urls: ['stun:turn.zarvox.org', 'turn:turn.zarvox.org:3478?transport=udp'] },
        // I'm including a fallback here to the author's personal STUN server to
        // make this easier to test out-of-the-box.  TODO: remove fallback value
        { urls: props.turnServerUrls || 'stun:turn.zarvox.org' },
      ],
    };

    this.isInitiator = props.selfParticipant._id < props.peerParticipant._id;

    this.pc = new RTCPeerConnection(rtcConfig);
    this.pc.addEventListener('icecandidate', this.onNewLocalCandidate);
    // Firefox doesn't support connectionstatechange or connectionState yet, so
    // just rely on iceConnectionState for now.
    this.pc.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange);
    this.pc.addEventListener('track', this.onNewRemoteTrack);
    this.pc.addEventListener('negotiationneeded', this.onNegotiationNeeded);

    // Add stream to RTCPeerConnection for self.
    const tracks = props.localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      // this.log(track, props.localStream);
      this.pc.addTrack(track);
    }

    if (props.signal) {
      // this.log(`signals: processing ${props.signal.messages.length} initial signals`);
      this.processSignalMessages(props.signal.messages, 0);
    }
  }

  componentDidUpdate(prevProps: CallLinkBoxProps, _prevState: CallLinkBoxState,
    _snapshot: any) {
    // Process any new signal messages in the updated props.
    if (this.props.signal) {
      // const newLength = this.props.signal.messages.length;
      const oldLength = prevProps.signal ? prevProps.signal.messages.length : 0;
      // this.log(`signals: old ${oldLength} new ${newLength}`);
      this.processSignalMessages(this.props.signal.messages, oldLength);
    }
  }

  componentWillUnmount() {
    // Tear down the connections and all active streams on them.
    this.pc.close();
  }

  log = (...args: any) => {
    // eslint-disable-next-line no-console
    console.log(this.props.peerParticipant._id, ...args);
  }

  onLocalOfferCreated = (offer: RTCSessionDescriptionInit) => {
    // this.log('onLocalOfferCreated');
    // this.log(offer);
    this.pc.setLocalDescription(offer);
    const offerObj = {
      type: offer.type,
      sdp: offer.sdp,
    };
    Meteor.call('signalPeer', this.props.selfParticipant._id, this.props.peerParticipant._id, { type: 'sdp', content: JSON.stringify(offerObj) });
  };

  processSignalMessages = (messages: CallSignalMessageType[], previouslyProcessed: number) => {
    const len = messages.length;
    for (let i = previouslyProcessed; i < len; i++) {
      // this.log(`signal ${i}: ${JSON.stringify(this.props.signal.messages[i])}`);
      this.handleSignal(messages[i]);
    }
  };

  handleSignal = (message: CallSignalMessageType) => {
    if (message.type === 'sdp') {
      // this.log('handle sdp');
      // Create an RTCSessionDescription using the received SDP offer.
      // Set it.  In the callback, create an answer, then set that as
      // the local description, then signal the initiator.
      const sdpDesc = JSON.parse(message.content);
      this.pc.setRemoteDescription(sdpDesc)
        .then(this.onRemoteDescriptionSet)
        .catch(this.onRemoteDescriptionSetFailure);
    } else if (message.type === 'iceCandidate') {
      // this.log('handle ice', message.content);
      const iceDesc = JSON.parse(message.content);
      if (iceDesc) {
        const remoteCandidate = new RTCIceCandidate(iceDesc);
        // TODO: error handling
        this.pc.addIceCandidate(remoteCandidate);
      } else {
        this.log('all candidates received');
      }
    } else {
      this.log('dunno what this message is:', message);
    }
  };

  onAnswerCreated = (answer: RTCSessionDescriptionInit) => {
    // this.log('onAnswerCreated', answer);
    this.pc.setLocalDescription(answer);
    const answerObj = {
      type: answer.type,
      sdp: answer.sdp,
    };
    Meteor.call('signalPeer', this.props.selfParticipant._id, this.props.peerParticipant._id, { type: 'sdp', content: JSON.stringify(answerObj) });
  };

  onAnswerCreatedFailure = (err: DOMException) => {
    this.log('onAnswerCreatedFailure', err);
  }

  onRemoteDescriptionSet = () => {
    // this.log('remoteDescriptionSet');
    if (!this.isInitiator) {
      this.pc.createAnswer().then(this.onAnswerCreated);
    }
  };

  onRemoteDescriptionSetFailure = (err: Error) => {
    this.log('remoteDescriptionSetFailure', err);
  };

  onNewLocalCandidate = (e: RTCPeerConnectionIceEvent) => {
    const iceCandidate = e.candidate;
    if (!iceCandidate) {
      this.log('local candidate list complete');
    }

    Meteor.call('signalPeer',
      this.props.selfParticipant._id,
      this.props.peerParticipant._id,
      { type: 'iceCandidate', content: JSON.stringify(iceCandidate) });
  };

  onNewRemoteTrack = (e: RTCTrackEvent) => {
    // this.log('newRemoteTrack', e);
    if (e.track.kind === 'audio') {
      // Wire the track directly to the audio element for playback with echo
      // cancellation.
      this.remoteStream.addTrack(e.track);

      // Wire in the spectrogram.
      const spectrum = this.spectrumRef.current;
      if (spectrum) {
        const stubStream = new MediaStream();
        stubStream.addTrack(e.track);
        spectrum.connect(stubStream);
      }
    } else {
      // Ignore non-audio tracks.
      // this.remoteStream.addTrack(e.track);
    }

    if (this.audioRef.current) {
      this.audioRef.current.srcObject = this.remoteStream;
    }
  };

  onNegotiationNeeded = (_e: Event) => {
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
    if (this.isInitiator) {
      this.pc.createOffer().then(this.onLocalOfferCreated);
    }

    // this.log('negotiationNeeded', e);
  };

  onIceConnectionStateChange = (_e: Event) => {
    // this.log('new ice connection state change:');
    // this.log(e);
    this.setState({
      iceConnectionState: this.pc.iceConnectionState,
    });
  };

  render() {
    const name = (this.props.peerProfile && this.props.peerProfile.displayName) || 'no profile wat';
    return (
      <OverlayTrigger
        key={`viewer-${this.props.peerParticipant._id}`}
        placement="right"
        overlay={(
          <Tooltip id={`caller-${this.props.peerParticipant._id}`}>
            <div>{name}</div>
            <div>
              connection status:
              {' '}
              {this.state.iceConnectionState}
            </div>
            {this.props.peerParticipant.muted &&
              <div>Muted (no one can hear them)</div>}
            {this.props.peerParticipant.deafened &&
              <div>Deafened (they can&apos;t hear anyone)</div>}
          </Tooltip>
        )}
      >
        <div
          key={`viewer-${this.props.peerParticipant._id}`}
          className="people-item"
        >
          <span className="initial">{name.slice(0, 1)}</span>
          <div className="webrtc">
            <span className={`connection ${this.state.iceConnectionState}`} />
            {this.props.peerParticipant.muted && <span className="muted"><FontAwesomeIcon icon={faMicrophone} /></span>}
            {this.props.peerParticipant.deafened && <span className="deafened"><FontAwesomeIcon icon={faHeadphonesAlt} /></span>}
            {!this.props.spectraDisabled ? (
              <Spectrum
                className="spectrogram"
                width={40}
                height={40}
                audioContext={this.props.audioContext}
                ref={this.spectrumRef}
              />
            ) : null}
          </div>
          <audio ref={this.audioRef} className="audio-sink" autoPlay playsInline muted={this.props.deafened} />
        </div>
      </OverlayTrigger>
    );
  }
}

const tracker = withTracker((params: CallLinkBoxParams) => {
  const signal = CallSignals.findOne({
    sender: params.peerParticipant._id,
    target: params.selfParticipant._id,
  });

  const peerProfile = Profiles.findOne(params.peerParticipant.createdBy);

  const turnServerConfig = PublicSettings.findOne({ name: 'webrtc.turnserver' });
  const turnServerUrls = (turnServerConfig && turnServerConfig.name === 'webrtc.turnserver' && turnServerConfig.value.urls) || [];

  const spectraDisabled = Flags.active('disable.spectra');

  return {
    signal,
    peerProfile,
    turnServerUrls,
    spectraDisabled,
  };
});

const CallLinkBoxContainer = tracker(CallLinkBox);

export default CallLinkBoxContainer;
