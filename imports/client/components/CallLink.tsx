import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import CallSignals from '../../lib/models/call_signals';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { CallSignalType, CallSignalMessageType } from '../../lib/schemas/call_signals';

// props:
//   selfParticipant: CallParticipantType
//   peerParticipant: CallParticipantType
//
// meteor data props:
//   candidates
//   signaling?
//
// state:
//   connection state?
//
// new
// awaiting-inbound-offer
// responding

interface CallLinkParams {
  selfParticipant: CallParticipantType;
  peerParticipant: CallParticipantType;
  stream: MediaStream;
}

interface CallLinkProps extends CallLinkParams {
  signal: CallSignalType | undefined;
}

interface CallLinkState {
  localCandidates: RTCIceCandidate[];
}

const rtcConfig = {
  iceServers: [
    // TODO: implement TURN relaying if necessary.
    // For what it's worth: all the setups I've tried so far have worked
    // without a TURN setup, but it's probably still worth investing in making
    // it work for the long tail of network configurations.
    // { urls: "turn:turn.zarvox.org:3478?transport=udp" },
    { urls: ['stun:turn.zarvox.org'] },
  ],
};

/*
const offerOptions = {
  offerToReceiveVideo: 1,
};
*/

class CallLink extends React.Component<CallLinkProps, CallLinkState> {
  private videoRef: React.RefObject<HTMLVideoElement>;

  private remoteStream: MediaStream;

  private pc: RTCPeerConnection;

  private isInitiator: boolean;

  constructor(props: CallLinkProps) {
    super(props);

    this.state = {
      localCandidates: [],
    };

    // Create a ref so we can get at the video element on the page to set
    // the srcObject.
    this.videoRef = React.createRef();

    // Create a stream object to populate tracks into as we receive them
    // from our peer.
    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection(rtcConfig);
    this.pc.addEventListener('icecandidate', this.onNewLocalCandidate);
    this.pc.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange);
    this.pc.addEventListener('connectionstatechange', this.onConnectionStateChange);
    this.pc.addEventListener('track', this.onNewRemoteTrack);
    this.pc.addEventListener('negotiationneeded', this.onNegotiationNeeded);

    // TODO: figure out where these actually come from
    // this.remoteStream.addEventListener("removetrack", this.onRemoveRemoteTrack);

    // Add stream to RTCPeerConnection for self.
    const tracks = props.stream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      this.log(track, props.stream);
      this.pc.addTrack(track);
    }

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
    this.isInitiator = props.selfParticipant._id < props.peerParticipant._id;
    if (this.isInitiator) {
      this.pc.createOffer().then(this.onLocalOfferCreated);
    }

    if (props.signal) {
      this.log(`signals: processing ${props.signal.messages.length} initial signals`);
      this.processSignalMessages(props.signal.messages, 0);
    }
  }

  componentDidUpdate(prevProps: CallLinkProps, _prevState: CallLinkState, _snapshot: any) {
    // Process any new signal messages in the updated props.
    if (this.props.signal) {
      const newLength = this.props.signal.messages.length;
      const oldLength = prevProps.signal ? prevProps.signal.messages.length : 0;
      this.log(`signals: old ${oldLength} new ${newLength}`);
      this.processSignalMessages(this.props.signal.messages, oldLength);
    }
  }

  componentWillUnmount() {
    // Tear down the connections and all active streams on them.
    this.pc.close();
  }

  // Convenience function to log the peer participant ID along with whatever
  // you wanted to see, so you can see just the logs from whatever participant
  // isn't connecting.
  log = (...args: any) => {
    console.log(this.props.peerParticipant._id, ...args);
  }

  onLocalOfferCreated = (offer: RTCSessionDescriptionInit) => {
    this.log('onLocalOfferCreated');
    this.log(offer);
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
      this.log('handle sdp');
      // Create an RTCSessionDescription using the received SDP offer.
      // Set it.  In the callback, create an answer, then set that as
      // the local description, then signal the initiator.
      const sdpDesc = JSON.parse(message.content);
      this.pc.setRemoteDescription(sdpDesc)
        .then(this.onRemoteDescriptionSet)
        .catch(this.onRemoteDescriptionSetFailure);
    } else if (message.type === 'iceCandidate') {
      this.log('handle ice', message.content);
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
    this.log('onAnswerCreated', answer);
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
    this.log('remoteDescriptionSet');
    if (!this.isInitiator) {
      this.pc.createAnswer().then(this.onAnswerCreated);
    }
  };

  onRemoteDescriptionSetFailure = (err: Error) => {
    this.log('remoteDescriptionSetFailure', err);
  };

  onNewLocalCandidate = (e: RTCPeerConnectionIceEvent) => {
    //    this.log("new local candidate:");
    //    this.log(e);
    const iceCandidate = e.candidate;
    if (iceCandidate) {
      this.setState((prevState) => {
        return { localCandidates: [...prevState.localCandidates, iceCandidate] };
      });
    } else {
      this.log('local candidate list complete');
    }

    Meteor.call('signalPeer',
      this.props.selfParticipant._id,
      this.props.peerParticipant._id,
      { type: 'iceCandidate', content: JSON.stringify(iceCandidate) });
  };

  onNewRemoteTrack = (e: RTCTrackEvent) => {
    this.log('newRemoteTrack', e);
    this.remoteStream.addTrack(e.track);
    if (this.videoRef.current) {
      this.videoRef.current.srcObject = this.remoteStream;
    }
  };

  onNegotiationNeeded = (e: Event) => {
    this.log('negotiationNeeded', e);
  };

  /*
  onRemoveRemoteTrack = (e: Event) => {
    this.log("removeRemoteTrack", e);
  };
  */

  onIceConnectionStateChange = (e: Event) => {
    this.log('new ice connection state change:');
    this.log(e);
    // Repaint.
    this.forceUpdate();
  };

  onConnectionStateChange = (e: Event) => {
    this.log('new connection state change:');
    this.log(e);
    // Repaint.
    this.forceUpdate();
  };

  onButtonClick = () => {
    this.forceUpdate();
  };

  render() {
    return (
      <div className="call-link">
        <div className="call-link-data">
          <span className="">
            Peer:
            <code>{this.props.peerParticipant._id}</code>
          </span>
          <span className="">
            Role:
            <code>{this.isInitiator ? 'initiator' : 'responder'}</code>
          </span>
          <span className="signalState">
            signal state:
            <code>{this.pc.signalingState}</code>
          </span>
          <span className="state">
            conn state:
            <code>{this.pc.connectionState}</code>
          </span>
          <span className="iceState">
            ICE state:
            <code>{this.pc.iceConnectionState}</code>
          </span>
          <span className="candidates">
            {this.state.localCandidates.length}
            {' '}
            candidates
          </span>
          {/* <button onClick={this.onButtonClick}>update</button> */}
        </div>
        <video ref={this.videoRef} className="call-link-video-sink" autoPlay playsInline />
      </div>
    );
  }
}

const CallLinkContainer = withTracker((props: CallLinkParams) => {
  // WebRTC is not a symmetric protocol like TCP, where both sides can
  // initiate and respond and you'll get a single connection.  For any
  // given link, one side produces an offer, and the other side produces a
  // reply.  To avoid generating extra traffic, we simply declare that
  // the peer with the lower CallParticipant ID is the initiator, and the
  // other peer the responder.

  // Determine if we are expected to be the initiator or the responder
  // for this call.
  // this.log("self:", selfParticipant);
  // this.log("peer:", peerParticipant);

  // Query Mongo for CallSignals that match.
  // CallSignals feels like it could use some work -- maybe
  // make each signal message into an object and then just push them
  // onto an array? and then just use observe on the right doc?
  const sessionQuery = {
    sender: props.peerParticipant._id,
    target: props.selfParticipant._id,
  };

  const signal = CallSignals.findOne(sessionQuery);
  return {
    signal,
  };
})(CallLink);

// const CallLinkContainer = tracker(CallLink);

export default CallLinkContainer;
