import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React, { ReactChild } from 'react';
import Button from 'react-bootstrap/Button';
import Flags from '../../flags';
import CallParticipants from '../../lib/models/call_participants';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { Subscribers } from '../subscribers';
import CallSection from './CallSection';

interface ViewerSubscriber {
  user: string;
  name: string;
}

interface PersonBoxProps {
  user: string;
  name: string;
  titleText?: string;
  tabId?: string;
  children?: ReactChild;
}

const ViewerPersonBox = ({
  user, name, titleText, children,
}: PersonBoxProps) => (
  <div key={`viewer-${user}`} title={titleText || name} className="people-item">
    <span className="initial">{name.slice(0, 1)}</span>
    { children }
  </div>
);

interface ChatPeopleParams {
  huntId: string;
  puzzleId: string;
}

interface ChatPeopleProps extends ChatPeopleParams {
  ready: boolean;
  viewers: ViewerSubscriber[];
  rtcViewers: ViewerSubscriber[];
  unknown: number;
  rtcParticipants: CallParticipantType[];
  rtcDisabled: boolean;
}

interface ChatPeopleState {
  // TODO: make this an enum of 'chatonly', 'requestingstream', 'streamerror', 'call',
  state: string;
  error: string;
  muted: boolean;
  // TOOD: media stream

  audioContext: AudioContext | undefined;
  rawMediaSource: MediaStream | undefined;
  // wrapperStreamSource: MediaStreamAudioSourceNode | undefined;
  gainNode: GainNode | undefined;
  // wrapperStreamDestination: MediaStreamAudioDestinationNode | undefined;
  leveledStreamSource: MediaStream | undefined;
}

// Helper to tear down tracks of streams
function stopTracks(stream: MediaStream | null | undefined) {
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      track.stop();
    });
  }
}

class ChatPeople extends React.Component<ChatPeopleProps, ChatPeopleState> {
  private htmlNodeRef: React.RefObject<HTMLAudioElement>;

  constructor(props: ChatPeopleProps) {
    super(props);
    this.state = {
      state: 'chatonly',
      error: '',
      muted: false,

      audioContext: undefined,
      rawMediaSource: undefined,
      // wrapperStreamSource: undefined,
      gainNode: undefined,
      // wrapperStreamDestination: undefined,
      leveledStreamSource: undefined,
    };

    this.htmlNodeRef = React.createRef();
  }

  componentWillUnmount() {
    // Stop any tracks that might be running.
    stopTracks(this.state.rawMediaSource);
  }

  toggleMuted = () => {
    const newGain = this.state.muted ? 1.0 : 0.0;
    if (this.state.gainNode && this.state.audioContext) {
      this.state.gainNode.gain.setValueAtTime(newGain, this.state.audioContext.currentTime);
    }

    this.setState((prevState) => ({
      muted: !prevState.muted,
    }));
  };

  joinCall = () => {
    if (navigator.mediaDevices) {
      // TODO: get user media, set the state in the callback.
      this.setState({
        state: 'requestingstream',
      });

      // Get the user media stream.
      const mediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: true },
          noiseSuppression: { ideal: true },
        },
        // TODO: conditionally allow video if enabled by feature flag?
      };

      navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(this.gotLocalMediaStream)
        .catch(this.handleLocalMediaStreamError);
    } else {
      this.setState({
        state: 'streamerror',
        error: 'Couldn\'t get local microphone: browser denies access on non-HTTPS origins',
      });
    }
  };

  gotLocalMediaStream = (mediaStream: MediaStream) => {
    // @ts-ignore ts doesn't know about the possible existence of webkitAudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const wrapperStreamDestination = audioContext.createMediaStreamDestination();
    const gainNode = audioContext.createGain();
    const gainValue = this.state.muted ? 0.0 : 1.0;
    gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);

    let wrapperStreamSource;

    const leveledStreamSource = new MediaStream();
    const rawTracks = mediaStream.getTracks();
    for (let i = 0; i < rawTracks.length; i++) {
      const rawTrack = rawTracks[i];
      if (rawTrack.kind === 'audio') {
        // Chrome doesn't support createMediaStreamTrackSource, so stuff the
        // track in another stream.
        const stubStream = new MediaStream();
        stubStream.addTrack(rawTrack);
        wrapperStreamSource = audioContext.createMediaStreamSource(stubStream);

        // Wire up the audio track to the gain node.
        wrapperStreamSource.connect(gainNode);

        // Then wire up the output of that gain node to our levels-adjusted track.
        gainNode.connect(wrapperStreamDestination);
        const innerTracks = wrapperStreamDestination.stream.getTracks();
        const leveledAudioTrack = innerTracks[0];

        // Add that track to our post-level-adjustment stream.
        leveledStreamSource.addTrack(leveledAudioTrack);
      }
      if (rawTrack.kind === 'video') {
        leveledStreamSource.addTrack(rawTrack);
      }
    }

    const htmlNode = this.htmlNodeRef.current;
    if (htmlNode) {
      htmlNode.srcObject = leveledStreamSource;
    }

    this.setState({
      state: 'call',
      audioContext,
      rawMediaSource: mediaStream,
      // wrapperStreamSource,
      gainNode,
      // wrapperStreamDestination,
      leveledStreamSource,
    });
  };

  handleLocalMediaStreamError = (e: MediaStreamError) => {
    this.setState({
      state: 'streamerror',
      error: `Couldn't get local microphone: ${e.message}`,
    });
  };

  leaveCall = () => {
    stopTracks(this.state.rawMediaSource);
    if (this.htmlNodeRef.current) {
      this.htmlNodeRef.current.srcObject = null;
    }

    this.setState({
      state: 'chatonly',
      muted: false,
      audioContext: undefined,
      rawMediaSource: undefined,
      // wrapperStreamSource: undefined,
      gainNode: undefined,
      // wrapperStreamDestination: undefined,
      leveledStreamSource: undefined,
    });
  };

  renderCallersSubsection = () => {
    const { rtcViewers, huntId, puzzleId } = this.props;
    switch (this.state.state) {
      case 'chatonly':
      case 'requestingstream': {
        const joinLabel = rtcViewers.length > 0 ? 'join audio call' : 'start audio call';
        return (
          <>
            <div className="av-actions">
              <Button variant="primary" size="sm" block onClick={this.joinCall}>{joinLabel}</Button>
            </div>
            <div className="chatter-subsection av-chatters">
              <header>
                {`${rtcViewers.length} caller${rtcViewers.length !== 1 ? 's' : ''}`}
              </header>
              <div className="people-list">
                {rtcViewers.map((viewer) => <ViewerPersonBox key={`person-${viewer.user}`} {...viewer} />)}
              </div>
            </div>
          </>
        );
      }
      case 'call':
        return (
          <CallSection
            huntId={huntId}
            puzzleId={puzzleId}
            onLeaveCall={this.leaveCall}
            onToggleMute={this.toggleMuted}
            muted={this.state.muted}
            audioContext={this.state.audioContext!}
            localStream={this.state.leveledStreamSource!}
          />
        );
      case 'streamerror':
        return (
          <div>
            {`ERROR GETTING MIC: ${this.state.error}`}
          </div>
        );
      default:
        // Should be unreachable.  TODO: make typescript know it
        return <div />;
    }
  };

  render() {
    const {
      ready,
      viewers,
      unknown,
      rtcDisabled,
    } = this.props;

    if (!ready) {
      return null;
    }

    const totalViewers = viewers.length + unknown;
    return (
      <section className="chatter-section">
        {/* TODO: mark this <audio> as muted before going to prod, lest people
            get self-feedback.  It's easier to test locally for now though. */}
        <audio ref={this.htmlNodeRef} autoPlay playsInline muted />
        {!rtcDisabled && this.renderCallersSubsection()}
        <div className="chatter-subsection non-av-viewers">
          <header>
            {`${totalViewers} other viewer${totalViewers !== 1 ? 's' : ''}`}
          </header>
          <div className="people-list">
            {viewers.map((viewer) => <ViewerPersonBox key={`person-${viewer.user}`} {...viewer} />)}
          </div>
        </div>
      </section>
    );
  }
}

// ChatPeopleContainer is the component that deals with all user presence and
// WebRTC call subscriptions, state, and visualization.
const ChatPeopleContainer = withTracker(({ huntId, puzzleId }: ChatPeopleParams) => {
  // A note on this feature flag: we still do the subs for call *metadata* for
  // simplicity even when webrtc is flagged off; we simply avoid rendering
  // anything in the UI (which prevents clients from subbing to 'call.join' or
  // doing signalling).
  const rtcDisabled = Flags.active('disable.webrtc');

  const subscriberTopic = `puzzle:${puzzleId}`;
  const subscribersHandle = Meteor.subscribe('subscribers.fetch', subscriberTopic);
  const callMembersHandle = Meteor.subscribe('call.metadata', huntId, puzzleId);
  const profilesHandle = Profiles.subscribeDisplayNames();

  const ready = subscribersHandle.ready() && callMembersHandle.ready() && profilesHandle.ready();
  if (!ready) {
    return {
      ready: false,
      unknown: 0,
      viewers: [] as ViewerSubscriber[],
      rtcViewers: [] as ViewerSubscriber[],
      rtcParticipants: [] as CallParticipantType[],
      rtcDisabled,
    };
  }

  let unknown = 0;
  const viewers: ViewerSubscriber[] = [];

  const rtcViewers: ViewerSubscriber[] = [];
  const rtcViewerIndex: any = {};

  const rtcParticipants = CallParticipants.find({
    hunt: huntId,
    call: puzzleId,
  }).fetch();
  rtcParticipants.forEach((p) => {
    if (p.createdBy === Meteor.userId()) {
      return;
    }

    const user = p.createdBy;
    const profile = Profiles.findOne(user);
    if (!profile || !profile.displayName) {
      unknown += 1;
      return;
    }

    // If the same user is joined twice in CallParticipants (from two different
    // tabs), dedupe in the viewer listing.
    // (We include both in rtcParticipants still.)
    if (!rtcViewerIndex[user]) {
      rtcViewers.push({ user, name: profile.displayName });
      rtcViewerIndex[user] = true;
    }
  });

  // eslint-disable-next-line no-restricted-globals
  Subscribers.find({ name: subscriberTopic }).forEach((s) => {
    if (!s.user) {
      unknown += 1;
      return;
    }

    if (rtcViewerIndex[s.user]) {
      // already counted among rtcViewers, don't duplicate
      return;
    }

    if (s.user === Meteor.userId()) {
      // no need to show self among viewers
      return;
    }

    const profile = Profiles.findOne(s.user);
    if (!profile || !profile.displayName) {
      unknown += 1;
      return;
    }

    viewers.push({ user: s.user, name: profile.displayName });
  });

  return {
    ready,
    unknown,
    viewers,
    rtcViewers,
    rtcParticipants,
    rtcDisabled,
  };
})(ChatPeople);

export default ChatPeopleContainer;
