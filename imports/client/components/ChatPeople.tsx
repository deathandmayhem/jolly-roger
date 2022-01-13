import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, {
  ReactChild, useCallback, useEffect, useLayoutEffect, useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import styled from 'styled-components';
import Flags from '../../flags';
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from '../../lib/config/webrtc';
import { getAvatarCdnUrl } from '../../lib/discord';
import CallHistories from '../../lib/models/mediasoup/call_histories';
import Peers from '../../lib/models/mediasoup/peers';
import Profiles from '../../lib/models/profiles';
import relativeTimeFormat from '../../lib/relativeTimeFormat';
import { PeerType } from '../../lib/schemas/mediasoup/peer';
import useSubscribeAvatars from '../hooks/use-subscribe-avatars';
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

const ViewerPersonBox = ({
  user, name, discordAvatarUrl, tab, children,
}: PersonBoxProps) => {
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
};

const PeopleListHeader = styled.header`
  padding-left: 1rem;
  text-indent: -1rem;
`;

interface ChatPeopleProps {
  huntId: string;
  puzzleId: string;
  onHeightChange: () => void;
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

  const { huntId, puzzleId, onHeightChange } = props;

  const subscriberTopic = `puzzle:${puzzleId}`;
  const subscribersLoading = useSubscribe('subscribers.fetch', subscriberTopic);
  const callMembersLoading = useSubscribe('mediasoup:metadata', huntId, puzzleId);
  const avatarsLoading = useSubscribeAvatars();

  const loading = subscribersLoading() || callMembersLoading() || avatarsLoading();

  // A note on this feature flag: we still do the subs for call *metadata* for
  // simplicity even when webrtc is flagged off; we simply avoid rendering
  // anything in the UI (which prevents clients from subbing to 'mediasoup:join'
  // or doing signalling).
  const rtcDisabled = useTracker(() => Flags.active('disable.webrtc'), []);

  const recentVoiceActivity = useTracker(() => (
    CallHistories.findOne({ call: puzzleId })?.lastActivity
  ), [puzzleId]);
  const [voiceActivityRelative, setVoiceActivityRelative] = useState<string>();
  useEffect(() => {
    let interval: number | undefined;
    if (recentVoiceActivity) {
      const formatter = () => relativeTimeFormat(recentVoiceActivity, {
        complete: false,
        minimumUnit: Meteor.isDevelopment ? 'second' : 'minute',
      });
      setVoiceActivityRelative(formatter());
      interval = Meteor.setInterval(() => {
        setVoiceActivityRelative(formatter());
      }, RECENT_ACTIVITY_TIME_WINDOW_MS);
    }
    return () => {
      if (interval) {
        Meteor.clearInterval(interval);
      }
    };
  }, [recentVoiceActivity]);

  const {
    unknown,
    viewers,
    rtcViewers,
    selfPeer,
  } = useTracker(() => {
    if (loading) {
      return {
        unknown: 0,
        viewers: [],
        rtcViewers: [],
        selfPeer: undefined,
      };
    }

    let unknownCount = 0;
    const viewersAcc: ViewerSubscriber[] = [];

    const rtcViewersAcc: ViewerSubscriber[] = [];
    const rtcViewerIndex: Record<string, boolean> = {};

    const rtcParticipants = Peers.find({
      hunt: huntId,
      call: puzzleId,
    }).fetch();
    let self: PeerType | undefined;
    rtcParticipants.forEach((p) => {
      if (p.createdBy === Meteor.userId() && p.tab === tabId) {
        self = p;
      }

      const user = p.createdBy;
      const profile = Profiles.findOne(user);
      if (!profile || !profile.displayName) {
        unknownCount += 1;
        return;
      }

      const discordAvatarUrl = getAvatarCdnUrl(profile?.discordAccount);

      // If the same user is joined twice (from two different tabs), dedupe in
      // the viewer listing. (We include both in rtcParticipants still.)
      rtcViewersAcc.push({
        user,
        name: profile.displayName,
        discordAvatarUrl,
        tab: p.tab,
      });
      rtcViewerIndex[user] = true;
    });

    Subscribers.find({ name: subscriberTopic }).forEach((s) => {
      if (rtcViewerIndex[s.user]) {
        // already counted among rtcViewers, don't duplicate
        return;
      }

      const profile = Profiles.findOne(s.user);
      if (!profile || !profile.displayName) {
        unknownCount += 1;
        return;
      }

      const discordAvatarUrl = getAvatarCdnUrl(profile?.discordAccount);

      viewersAcc.push({
        user: s.user,
        name: profile.displayName,
        discordAvatarUrl,
        tab: undefined,
      });
    });

    return {
      unknown: unknownCount,
      viewers: viewersAcc,
      rtcViewers: rtcViewersAcc,
      selfPeer: self,
    };
  }, [loading, subscriberTopic, huntId, puzzleId]);

  const updateGain = useCallback((muted: boolean) => {
    const newGain = muted ? 0.0 : 1.0;
    if (audioState.gainNode && audioState.audioContext) {
      audioState.gainNode.gain.setValueAtTime(newGain, audioState.audioContext.currentTime);
    }
  }, [audioState]);

  const updatePeerState = useCallback((muted: boolean, deafened: boolean) => {
    const effectiveState = participantState(muted, deafened);
    if (selfPeer) {
      Meteor.call('mediasoup:peer_set_state', selfPeer._id, effectiveState);
    }
  }, [selfPeer]);

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
      updatePeerState(nextState.muted, nextState.deafened);

      return nextState;
    });
  }, [updateGain, updatePeerState]);

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
      updatePeerState(nextState.muted, nextState.deafened);

      return nextState;
    });
  }, [updateGain, updatePeerState]);

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

      let mediaStream: MediaStream;
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

  useLayoutEffect(() => {
    // Notify parent whenever we might have changed size:
    // * on viewers or rtcViewers counts change
    // * on expand/collapse of the callers or viewers
    // * when joining the audiocall
    onHeightChange();
  }, [
    onHeightChange,
    rtcViewers.length,
    viewers.length,
    callersExpanded,
    viewersExpanded,
    callState,
    voiceActivityRelative,
  ]);

  if (loading) {
    return null;
  }

  // TODO: find osme way to factor this out other than "immediately invoked fat-arrow function"
  const callersSubsection = (() => {
    const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;
    switch (callState) {
      case CallState.CHAT_ONLY:
      case CallState.REQUESTING_STREAM: {
        const joinLabel = rtcViewers.length > 0 ? 'Join audio call' : 'Start audio call';
        return (
          <>
            <div className="av-actions">
              <Button variant="primary" size="sm" block onClick={joinCall}>{joinLabel}</Button>
            </div>
            <div className="chatter-subsection av-chatters">
              <PeopleListHeader onClick={toggleCallersExpanded}>
                <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
                {`${rtcViewers.length} caller${rtcViewers.length !== 1 ? 's' : ''}`}
                {voiceActivityRelative && (
                  <>
                    {' (last voice activity: '}
                    {voiceActivityRelative}
                    )
                  </>
                )}
              </PeopleListHeader>
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
            onHeightChange={onHeightChange}
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
      {!rtcDisabled && callersSubsection}
      <div className="chatter-subsection non-av-viewers">
        <PeopleListHeader onClick={toggleViewersExpanded}>
          <FontAwesomeIcon fixedWidth icon={viewersHeaderIcon} />
          {`${totalViewers} viewer${totalViewers !== 1 ? 's' : ''}`}
        </PeopleListHeader>
        <div className={classnames('people-list', { collapsed: !viewersExpanded })}>
          {viewers.map((viewer) => <ViewerPersonBox key={`person-${viewer.user}`} {...viewer} />)}
        </div>
      </div>
    </section>
  );
};

export default ChatPeople;
