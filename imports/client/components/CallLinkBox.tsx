import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import { getAvatarCdnUrl } from '../../lib/discord';
import CallSignals from '../../lib/models/call_signals';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { CallSignalType, CallSignalMessageType } from '../../lib/schemas/call_signals';
import { ProfileType } from '../../lib/schemas/profiles';
import { RTCConfigType } from '../rtc_config';
import Spectrum from './Spectrum';

interface CallLinkBoxState {
  iceConnectionState: RTCIceConnectionState;
}

interface CallLinkBoxParams {
  rtcConfig: RTCConfigType;
  selfParticipant: CallParticipantType;
  peerParticipant: CallParticipantType;
  localStream: MediaStream;
  audioContext: AudioContext;
  deafened: boolean;
}

interface CallLinkBoxProps extends CallLinkBoxParams {
  signal: CallSignalType | undefined;
  peerProfile: ProfileType | undefined;
  spectraDisabled: boolean;
}

class CallLinkBox extends React.PureComponent<CallLinkBoxProps, CallLinkBoxState> {
  private audioRef: React.RefObject<HTMLVideoElement>;

  private spectrumComponent: Spectrum | null;

  private spectrumStream: MediaStream | undefined;

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
    this.spectrumComponent = null;

    // No spectrumStream until we get one from the remote.
    this.spectrumStream = undefined;

    // Create a stream object to populate tracks into as we receive them from
    // our peer.
    this.remoteStream = new MediaStream();

    const { username, credential, urls } = props.rtcConfig;
    const rtcConfig = {
      iceServers: [
        {
          username,
          credential,
          urls,
        },
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

      // Save a copy of the spectrum stream to feed the spectrogram when applicable.
      this.spectrumStream = new MediaStream();
      this.spectrumStream.addTrack(e.track);

      // Connect the stream to the spectrogram if both are ready.
      this.connectSpectrogramIfReady();
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

  connectSpectrogramIfReady = () => {
    // Connect the stream to the spectrogram if ready.
    if (this.spectrumComponent && this.spectrumStream) {
      this.spectrumComponent.connect(this.spectrumStream);
    }
  };

  render() {
    const name = (this.props.peerProfile && this.props.peerProfile.displayName) || 'no profile wat';
    const discordAccount = this.props.peerProfile && this.props.peerProfile.discordAccount;
    const discordAvatarUrl = discordAccount ? getAvatarCdnUrl(discordAccount) : undefined;
    return (
      <OverlayTrigger
        key={`viewer-${this.props.peerParticipant._id}`}
        placement="right"
        overlay={(
          <Tooltip
            id={`caller-${this.props.peerParticipant._id}`}
            className="chatter-tooltip"
          >
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
          className={classnames('people-item', {
            muted: this.props.peerParticipant.muted,
            deafened: this.props.peerParticipant.deafened,
            live: !this.props.peerParticipant.muted && !this.props.peerParticipant.deafened,
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
            {this.props.peerParticipant.muted && <span className="icon muted-icon"><FontAwesomeIcon icon={faMicrophoneSlash} /></span>}
            {this.props.peerParticipant.deafened && <span className="icon deafened-icon"><FontAwesomeIcon icon={faVolumeMute} /></span>}
            {(!this.props.spectraDisabled &&
              !this.props.peerParticipant.muted) ? (
                <Spectrum
                  className="spectrogram"
                  width={40}
                  height={40}
                  audioContext={this.props.audioContext}
                  ref={((spectrum) => {
                    this.spectrumComponent = spectrum;
                    // Connect the stream to the spectrogram if both are ready.
                    this.connectSpectrogramIfReady();
                  })}
                />
              ) : null}
            <span className={`connection ${this.state.iceConnectionState}`} />
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

  // Subscription for Profiles is provided by ChatPeople.
  const peerProfile = Profiles.findOne(params.peerParticipant.createdBy);
  const spectraDisabled = Flags.active('disable.spectra');

  return {
    signal,
    peerProfile,
    spectraDisabled,
  };
});

const CallLinkBoxContainer = tracker(CallLinkBox);

export default CallLinkBoxContainer;
