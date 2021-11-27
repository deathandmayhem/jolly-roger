import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { useTracker } from 'meteor/react-meteor-data';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, {
  ReactChild, useCallback, useEffect, useRef, useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import { getAvatarCdnUrl } from '../../lib/discord';
import CallParticipants from '../../lib/models/call_participants';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participant';
import { Subscribers } from '../subscribers';
import { PREFERRED_AUDIO_DEVICE_STORAGE_KEY } from './AudioConfig';
import CallSection from './CallSection';

const tabId = Random.id();

interface ViewerSubscriber {
  user: string;
  name: string;
  discordAvatarUrl: string | undefined;
  tab: string | undefined;
}

interface PersonBoxProps extends ViewerSubscriber {
  children?: ReactChild;
}

function ViewerPersonBox({
  user, name, discordAvatarUrl, tab, children,
}: PersonBoxProps) {
  return (
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
        {discordAvatarUrl ? (
          <img
            alt={`${name}'s Discord avatar`}
            src={discordAvatarUrl}
            className="discord-avatar"
          />
        ) : (
          <span className="initial">{name.slice(0, 1)}</span>
        )}
        { children }
      </div>
    </OverlayTrigger>
  );
}

interface ChatPeopleProps {
  huntId: string;
  puzzleId: string;
}

interface ChatPeopleTracker {
  ready: boolean;
  viewers: ViewerSubscriber[];
  rtcViewers: ViewerSubscriber[];
  unknown: number;
  selfParticipant: CallParticipantType | undefined;
  rtcDisabled: boolean;
}

enum CallState {
  CHAT_ONLY = 'chatonly',
  REQUESTING_STREAM = 'requestingstream',
  STREAM_ERROR = 'streamerror',
  IN_CALL = 'call',
}

interface AudioControls {
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
}

interface ChatAudioState {
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

// ChatPeople is the component that deals with all user presence and
// WebRTC call subscriptions, state, and visualization.
const ChatPeople = (props: ChatPeopleProps) => {
  const htmlNodeRef = useRef<HTMLAudioElement>(null);
  const [callState, setCallState] = useState<CallState>(CallState.CHAT_ONLY);
  const [error, setError] = useState<string>('');

  const [localAudioControls, setLocalAudioControls] = useState<AudioControls>({
    muted: false,
    deafened: false,
  });

  const [callersExpanded, setCallersExpanded] = useState<boolean>(true);
  const [viewersExpanded, setViewersExpanded] = useState<boolean>(true);

  const [audioState, setAudioState] = useState<ChatAudioState>({
    audioContext: undefined,
    rawMediaSource: undefined,
    gainNode: undefined,
    leveledStreamSource: undefined,
  });

  const { huntId, puzzleId } = props;

  const tracker: ChatPeopleTracker = useTracker(() => {
    // A note on this feature flag: we still do the subs for call *metadata* for
    // simplicity even when webrtc is flagged off; we simply avoid rendering
    // anything in the UI (which prevents clients from subbing to 'call.join' or
    // doing signalling).
    const rtcDisabled = Flags.active('disable.webrtc');

    const subscriberTopic = `puzzle:${puzzleId}`;
    const subscribersHandle = Meteor.subscribe('subscribers.fetch', subscriberTopic);
    const callMembersHandle = Meteor.subscribe('call.metadata', huntId, puzzleId);
    const profilesHandle = Profiles.subscribeAvatars();

    const ready = subscribersHandle.ready() && callMembersHandle.ready() && profilesHandle.ready();
    if (!ready) {
      return {
        ready: false,
        unknown: 0,
        viewers: [] as ViewerSubscriber[],
        rtcViewers: [] as ViewerSubscriber[],
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

      const discordAccount = profile.discordAccount;
      const discordAvatarUrl = discordAccount && getAvatarCdnUrl(discordAccount);

      // If the same user is joined twice in CallParticipants (from two different
      // tabs), dedupe in the viewer listing.
      // (We include both in rtcParticipants still.)
      rtcViewers.push({
        user,
        name: profile.displayName,
        discordAvatarUrl,
        tab: p.tab,
      });
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

      const discordAccount = profile.discordAccount;
      const discordAvatarUrl = discordAccount && getAvatarCdnUrl(discordAccount);

      viewers.push({
        user: s.user,
        name: profile.displayName,
        discordAvatarUrl,
        tab: undefined,
      });
    });

    return {
      ready,
      unknown,
      viewers,
      rtcViewers,
      selfParticipant,
      rtcDisabled,
    };
  }, [huntId, puzzleId]);

  const {
    ready,
    unknown,
    viewers,
    rtcViewers,
    selfParticipant,
    rtcDisabled,
  } = tracker;

  const updateGain = useCallback((muted: boolean) => {
    const newGain = muted ? 0.0 : 1.0;
    if (audioState.gainNode && audioState.audioContext) {
      audioState.gainNode.gain.setValueAtTime(newGain, audioState.audioContext.currentTime);
    }
  }, [audioState]);

  const updateCallParticipantState = useCallback((muted: boolean, deafened: boolean) => {
    const effectiveState = participantState(muted, deafened);
    if (selfParticipant) {
      Meteor.call('setCallParticipantState', selfParticipant._id, effectiveState,
        (err: Meteor.Error | undefined) => {
          if (err) {
            // Ignore.  Not much we can do here; the server failed to accept our change.
          }
        });
    }
  }, [selfParticipant]);

  const toggleMuted = useCallback(() => {
    setLocalAudioControls((prevState) => {
      const nextState = {
        muted: !(prevState.deafened || prevState.muted),
        deafened: false,
      };

      const prevEffectiveMuteState = prevState.muted || prevState.deafened;
      const nextEffectiveMuteState = nextState.muted;

      // Update gain if needed
      if (prevEffectiveMuteState !== nextEffectiveMuteState) {
        updateGain(nextEffectiveMuteState);
      }

      // Tell the server about our new state
      updateCallParticipantState(nextState.muted, nextState.deafened);

      return nextState;
    });
  }, [updateGain, updateCallParticipantState]);

  const toggleDeafened = useCallback(() => {
    setLocalAudioControls((prevState) => {
      const nextState = {
        muted: prevState.muted,
        deafened: !prevState.deafened,
      };

      const prevEffectiveMuteState = prevState.muted || prevState.deafened;
      const nextEffectiveMuteState = prevState.muted || nextState.deafened;
      // Update gain if needed
      if (prevEffectiveMuteState !== nextEffectiveMuteState) {
        updateGain(nextEffectiveMuteState);
      }

      // Tell the server about our new state
      updateCallParticipantState(nextState.muted, nextState.deafened);

      return nextState;
    });
  }, [updateGain, updateCallParticipantState]);

  const toggleCallersExpanded = useCallback(() => {
    setCallersExpanded((prevState) => {
      return !prevState;
    });
  }, []);

  const toggleViewersExpanded = useCallback(() => {
    setViewersExpanded((prevState) => {
      return !prevState;
    });
  }, []);

  const { muted, deafened } = localAudioControls;

  const joinCall = useCallback(async () => {
    if (navigator.mediaDevices) {
      setCallState(CallState.REQUESTING_STREAM);
      const preferredAudioDeviceId = localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ||
        undefined;
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

      let mediaStream: MediaStream | undefined;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
      } catch (e) {
        setError(`Couldn't get local microphone: ${(e as Error).message}`);
        setCallState(CallState.STREAM_ERROR);
        return;
      }

      const AudioContext = window.AudioContext ||
        (window as {webkitAudioContext?: AudioContext}).webkitAudioContext;
      const audioContext = new AudioContext();
      const wrapperStreamDestination = audioContext.createMediaStreamDestination();
      const gainNode = audioContext.createGain();
      const gainValue = muted ? 0.0 : 1.0;
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

      const htmlNode = htmlNodeRef.current;
      if (htmlNode) {
        htmlNode.srcObject = leveledStreamSource;
      }

      setAudioState({
        audioContext,
        rawMediaSource: mediaStream,
        gainNode,
        leveledStreamSource,
      });
      setCallState(CallState.IN_CALL);
    } else {
      setError('Couldn\'t get local microphone: browser denies access on non-HTTPS origins');
      setCallState(CallState.STREAM_ERROR);
    }
  }, [muted]);

  const leaveCall = useCallback(() => {
    stopTracks(audioState.rawMediaSource);
    if (htmlNodeRef.current) {
      htmlNodeRef.current.srcObject = null;
    }

    setCallState(CallState.CHAT_ONLY);
    setLocalAudioControls({
      muted: false,
      deafened: false,
    });
    setAudioState({
      audioContext: undefined,
      rawMediaSource: undefined,
      gainNode: undefined,
      leveledStreamSource: undefined,
    });
  }, [audioState]);

  useEffect(() => {
    // When unmounting, stop any tracks that might be running
    return () => {
      // Stop any tracks that might be running.
      stopTracks(audioState.rawMediaSource);
    };
  }, [audioState.rawMediaSource]);

  if (!ready) {
    return null;
  }

  // TODO: find osme way to factor this out other than "immediately invoked fat-arrow function"
  const callersSubsection = (() => {
    const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;
    switch (callState) {
      case CallState.CHAT_ONLY:
      case CallState.REQUESTING_STREAM: {
        const joinLabel = rtcViewers.length > 0 ? 'join audio call' : 'start audio call';
        return (
          <>
            <div className="av-actions">
              <Button variant="primary" size="sm" block onClick={joinCall}>{joinLabel}</Button>
            </div>
            <div className="chatter-subsection av-chatters">
              <header onClick={toggleCallersExpanded}>
                <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
                {`${rtcViewers.length} caller${rtcViewers.length !== 1 ? 's' : ''}`}
              </header>
              <div className={classnames('people-list', { collapsed: !callersExpanded })}>
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
            onLeaveCall={leaveCall}
            onToggleMute={toggleMuted}
            onToggleDeafen={toggleDeafened}
            muted={muted || deafened}
            deafened={deafened}
            audioContext={audioState.audioContext!}
            localStream={audioState.leveledStreamSource!}
            callersExpanded={callersExpanded}
            onToggleCallersExpanded={toggleCallersExpanded}
          />
        );
      case CallState.STREAM_ERROR:
        return (
          <div>
            {`ERROR GETTING MIC: ${error}`}
          </div>
        );
      default:
        // Unreachable.  TypeScript knows this, but eslint doesn't.
        return <div />;
    }
  })();

  const totalViewers = viewers.length + unknown;
  const viewersHeaderIcon = viewersExpanded ? faCaretDown : faCaretRight;
  return (
    <section className="chatter-section">
      <audio ref={htmlNodeRef} autoPlay playsInline muted />
      {!rtcDisabled && callersSubsection}
      <div className="chatter-subsection non-av-viewers">
        <header onClick={toggleViewersExpanded}>
          <FontAwesomeIcon fixedWidth icon={viewersHeaderIcon} />
          {`${totalViewers} viewer${totalViewers !== 1 ? 's' : ''}`}
        </header>
        <div className={classnames('people-list', { collapsed: !viewersExpanded })}>
          {viewers.map((viewer) => <ViewerPersonBox key={`person-${viewer.user}`} {...viewer} />)}
        </div>
      </div>
    </section>
  );
};

export default ChatPeople;
