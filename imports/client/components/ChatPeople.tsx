import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { withTracker } from 'meteor/react-meteor-data';
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, { ReactChild } from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import CallParticipants from '../../lib/models/call_participants';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { Subscribers } from '../subscribers';
import CallSection from './CallSection';

const tabId = Random.id();

interface ViewerSubscriber {
  user: string;
  name: string;
  tab: string | undefined;
}

interface PersonBoxProps extends ViewerSubscriber {
  children?: ReactChild;
}

const ViewerPersonBox = ({
  user, name, tab, children,
}: PersonBoxProps) => (
  <OverlayTrigger
    key={`viewer-${user}-${tab}`}
    placement="right"
    overlay={(
      <Tooltip id={`viewer-${user}-${tab}`}>
        {name}
      </Tooltip>
    )}
  >
    <div key={`viewer-${user}-${tab}`} className="people-item">
      <span className="initial">{name.slice(0, 1)}</span>
      { children }
    </div>
  </OverlayTrigger>
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
  selfParticipant: CallParticipantType | undefined;
  rtcDisabled: boolean;
}

enum CallState {
  CHAT_ONLY = 'chatonly',
  REQUESTING_STREAM = 'requestingstream',
  STREAM_ERROR = 'streamerror',
  IN_CALL = 'call',
}

interface ChatPeopleState {
  state: CallState;
  error: string;

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
  muted: boolean;
  deafened: boolean;
  // When true, callers/viewers are listed individually
  callersExpanded: boolean;
  viewersExpanded: boolean;

  audioContext: AudioContext | undefined;
  rawMediaSource: MediaStream | undefined;
  gainNode: GainNode | undefined;
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

function participantState(explicitlyMuted: boolean, deafened: boolean) {
  if (deafened) {
    return 'deafened';
  } else if (explicitlyMuted) {
    return 'muted';
  } else {
    return 'active';
  }
}

class ChatPeople extends React.Component<ChatPeopleProps, ChatPeopleState> {
  private htmlNodeRef: React.RefObject<HTMLAudioElement>;

  constructor(props: ChatPeopleProps) {
    super(props);
    this.state = {
      state: CallState.CHAT_ONLY,
      error: '',
      muted: false,
      deafened: false,
      callersExpanded: true,
      viewersExpanded: true,

      audioContext: undefined,
      rawMediaSource: undefined,
      gainNode: undefined,
      leveledStreamSource: undefined,
    };

    this.htmlNodeRef = React.createRef();
  }

  componentWillUnmount() {
    // Stop any tracks that might be running.
    stopTracks(this.state.rawMediaSource);
  }

  toggleMuted = () => {
    this.setState((prevState, props) => {
      const nextState = {
        muted: !(prevState.deafened || prevState.muted),
        deafened: false,
      };

      const prevEffectiveMuteState = prevState.muted || prevState.deafened;
      const nextEffectiveMuteState = nextState.muted;

      // Update gain if needed
      if (prevEffectiveMuteState !== nextEffectiveMuteState) {
        const newGain = nextEffectiveMuteState ? 0.0 : 1.0;
        if (prevState.gainNode && prevState.audioContext) {
          prevState.gainNode.gain.setValueAtTime(newGain, prevState.audioContext.currentTime);
        }
      }

      const effectiveState = participantState(nextState.muted, nextState.deafened);
      if (props.selfParticipant) {
        Meteor.call('setCallParticipantState', props.selfParticipant._id, effectiveState,
          (err: Meteor.Error | undefined) => {
            if (err) {
              // Ignore.  Not much we can do here; the server failed to accept our change.
            }
          });
      }

      return nextState;
    });
  };

  toggleDeafened = () => {
    this.setState((prevState, props) => {
      const nextState = {
        deafened: !prevState.deafened,
      };

      const prevEffectiveMuteState = prevState.muted || prevState.deafened;
      const nextEffectiveMuteState = prevState.muted || nextState.deafened;

      // Update gain if needed
      if (prevEffectiveMuteState !== nextEffectiveMuteState) {
        const newGain = nextEffectiveMuteState ? 0.0 : 1.0;
        if (prevState.gainNode && prevState.audioContext) {
          prevState.gainNode.gain.setValueAtTime(newGain, prevState.audioContext.currentTime);
        }
      }

      const effectiveState = participantState(prevState.muted, nextState.deafened);
      if (props.selfParticipant) {
        Meteor.call('setCallParticipantState', props.selfParticipant._id, effectiveState,
          (err: Meteor.Error | undefined) => {
            if (err) {
              // Ignore.  Not much we can do here; the server failed to accept our change.
            }
          });
      }

      return nextState;
    });
  };

  joinCall = () => {
    if (navigator.mediaDevices) {
      this.setState({
        state: CallState.REQUESTING_STREAM,
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
        state: CallState.STREAM_ERROR,
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

    const leveledStreamSource = new MediaStream();
    const rawTracks = mediaStream.getTracks();
    for (let i = 0; i < rawTracks.length; i++) {
      const rawTrack = rawTracks[i];
      if (rawTrack.kind === 'audio') {
        // Chrome doesn't support createMediaStreamTrackSource, so stuff the
        // track in another stream.
        const stubStream = new MediaStream();
        stubStream.addTrack(rawTrack);
        const wrapperStreamSource = audioContext.createMediaStreamSource(stubStream);

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
      state: CallState.IN_CALL,
      audioContext,
      rawMediaSource: mediaStream,
      gainNode,
      leveledStreamSource,
    });
  };

  handleLocalMediaStreamError = (e: MediaStreamError) => {
    this.setState({
      state: CallState.STREAM_ERROR,
      error: `Couldn't get local microphone: ${e.message}`,
    });
  };

  leaveCall = () => {
    stopTracks(this.state.rawMediaSource);
    if (this.htmlNodeRef.current) {
      this.htmlNodeRef.current.srcObject = null;
    }

    this.setState({
      state: CallState.CHAT_ONLY,
      muted: false,
      deafened: false,
      audioContext: undefined,
      rawMediaSource: undefined,
      gainNode: undefined,
      leveledStreamSource: undefined,
    });
  };

  toggleCallersExpanded = () => {
    this.setState((prevState) => ({
      callersExpanded: !prevState.callersExpanded,
    }));
  }

  toggleViewersExpanded = () => {
    this.setState((prevState) => ({
      viewersExpanded: !prevState.viewersExpanded,
    }));
  }

  renderCallersSubsection = () => {
    const { rtcViewers, huntId, puzzleId } = this.props;
    const callersHeaderIcon = this.state.callersExpanded ? faCaretDown : faCaretRight;
    switch (this.state.state) {
      case CallState.CHAT_ONLY:
      case CallState.REQUESTING_STREAM: {
        const joinLabel = rtcViewers.length > 0 ? 'join audio call' : 'start audio call';
        return (
          <>
            <div className="av-actions">
              <Button variant="primary" size="sm" block onClick={this.joinCall}>{joinLabel}</Button>
            </div>
            <div className="chatter-subsection av-chatters">
              <header onClick={this.toggleCallersExpanded}>
                <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
                {`${rtcViewers.length} caller${rtcViewers.length !== 1 ? 's' : ''}`}
              </header>
              <div className={classnames('people-list', { collapsed: !this.state.callersExpanded })}>
                {rtcViewers.map((viewer) => <ViewerPersonBox key={`person-${viewer.user}-${viewer.tab}`} {...viewer} />)}
              </div>
            </div>
          </>
        );
      }
      case CallState.IN_CALL:
        return (
          <CallSection
            huntId={huntId}
            puzzleId={puzzleId}
            tabId={tabId}
            onLeaveCall={this.leaveCall}
            onToggleMute={this.toggleMuted}
            onToggleDeafen={this.toggleDeafened}
            muted={this.state.muted || this.state.deafened}
            deafened={this.state.deafened}
            audioContext={this.state.audioContext!}
            localStream={this.state.leveledStreamSource!}
            callersExpanded={this.state.callersExpanded}
            onToggleCallersExpanded={this.toggleCallersExpanded}
          />
        );
      case CallState.STREAM_ERROR:
        return (
          <div>
            {`ERROR GETTING MIC: ${this.state.error}`}
          </div>
        );
      default:
        // Unreachable.  TypeScript knows this, but eslint doesn't.
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
    const viewersHeaderIcon = this.state.viewersExpanded ? faCaretDown : faCaretRight;
    return (
      <section className="chatter-section">
        <audio ref={this.htmlNodeRef} autoPlay playsInline muted />
        {!rtcDisabled && this.renderCallersSubsection()}
        <div className="chatter-subsection non-av-viewers">
          <header onClick={this.toggleViewersExpanded}>
            <FontAwesomeIcon fixedWidth icon={viewersHeaderIcon} />
            {`${totalViewers} viewer${totalViewers !== 1 ? 's' : ''}`}
          </header>
          <div className={classnames('people-list', { collapsed: !this.state.viewersExpanded })}>
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
      selfParticipant: undefined as (CallParticipantType | undefined),
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
  let selfParticipant;
  rtcParticipants.forEach((p) => {
    if (p.createdBy === Meteor.userId() && p.tab === tabId) {
      selfParticipant = p;
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
    rtcViewers.push({ user, name: profile.displayName, tab: p.tab });
    rtcViewerIndex[user] = true;
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

    const profile = Profiles.findOne(s.user);
    if (!profile || !profile.displayName) {
      unknown += 1;
      return;
    }

    viewers.push({ user: s.user, name: profile.displayName, tab: undefined });
  });

  return {
    ready,
    unknown,
    viewers,
    rtcViewers,
    rtcParticipants,
    selfParticipant,
    rtcDisabled,
  };
})(ChatPeople);

export default ChatPeopleContainer;
