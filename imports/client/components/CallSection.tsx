import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, { useCallback } from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import { getAvatarCdnUrl } from '../../lib/discord';
import CallParticipants from '../../lib/models/call_participants';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participant';
import { ProfileType } from '../../lib/schemas/profile';
import { RTCConfigType, RTCConfig } from '../rtc_config';
import CallLinkBox from './CallLinkBox';
import Spectrum from './Spectrum';

interface RTCCallSectionProps {
  huntId: string;
  puzzleId: string;
  tabId: string;
  onLeaveCall(): void;
  onToggleMute(): void;
  onToggleDeafen(): void;
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded(): void;
}

interface RTCCallSectionTrackerData {
  rtcConfigReady: boolean;
  rtcConfig: RTCConfigType | undefined;
  participantsReady: boolean;
  participants: CallParticipantType[];
  selfParticipant: CallParticipantType | undefined;
  signalsReady: boolean;
  selfUserId: string | undefined;
  selfProfile: ProfileType | undefined;
  spectraDisabled: boolean;
}

const RTCCallSection = (props: RTCCallSectionProps) => {
  const {
    huntId,
    puzzleId,
    tabId,
    onLeaveCall,
    onToggleMute,
    onToggleDeafen,
    muted,
    deafened,
    audioContext,
    localStream,
    callersExpanded,
    onToggleCallersExpanded,
  } = props;

  const tracker: RTCCallSectionTrackerData = useTracker(() => {
    const joinSub = Meteor.subscribe('call.join', huntId, puzzleId, tabId);
    const participants = joinSub.ready() ? CallParticipants.find({
      hunt: huntId,
      call: puzzleId,
    }).fetch() : [];

    const rtcConfigSub = Meteor.subscribe('rtcconfig');
    const rtcConfig = RTCConfig.findOne('rtcconfig');

    const selfUserId = Meteor.userId() || undefined;
    const selfProfile = selfUserId ? Profiles.findOne(selfUserId) : undefined;
    const selfParticipant = participants.find((p) => {
      return p.createdBy === selfUserId && p.tab === tabId;
    });
    let signalsReady;
    if (selfParticipant) {
      const signalsSub = Meteor.subscribe('call.signal', selfParticipant._id);
      signalsReady = signalsSub.ready();
    } else {
      signalsReady = false;
    }

    const spectraDisabled = Flags.active('disable.spectra');

    return {
      rtcConfigReady: rtcConfigSub.ready(),
      rtcConfig,
      participantsReady: joinSub.ready(),
      selfParticipant,
      selfProfile,
      participants,
      signalsReady,
      selfUserId,
      spectraDisabled,
    };
  }, [huntId, puzzleId, tabId]);

  const nonSelfParticipants = useCallback(() => {
    return tracker.participants.filter((p) => {
      return (p.createdBy !== tracker.selfUserId) || (p.tab !== tabId);
    });
  }, [tracker.participants, tracker.selfUserId, tabId]);

  const toggleMuted = useCallback(() => {
    onToggleMute();
  }, [onToggleMute]);

  const toggleDeafened = useCallback(() => {
    onToggleDeafen();
  }, [onToggleDeafen]);

  const leaveCall = useCallback(() => {
    onLeaveCall();
  }, [onLeaveCall]);

  const spectrumRefCallback = useCallback((spectrum) => {
    if (spectrum) {
      spectrum.connect(localStream);
    }
  }, [localStream]);

  const selfProfile = tracker.selfProfile;
  const discordAvatarUrl = getAvatarCdnUrl(selfProfile?.discordAccount);
  const initial = selfProfile ? selfProfile.displayName.slice(0, 1) : 'U'; // get it?  it's you
  const selfBox = (
    <OverlayTrigger
      key="self"
      placement="right"
      overlay={(
        <Tooltip id="caller-self">
          <div>You are in the call.</div>
          {muted && <div>You are currently muted and will transmit no audio.</div>}
          {deafened && <div>You are currently deafened and will hear no audio.</div>}
        </Tooltip>
      )}
    >
      <div
        key="self"
        className={classnames('people-item', {
          muted,
          deafened,
          live: !muted && !deafened,
        })}
      >
        {discordAvatarUrl ? (
          <img
            alt="Your own Discord avatar"
            className="discord-avatar"
            src={discordAvatarUrl}
          />
        ) : (
          <span className="initial">{initial}</span>
        )}
        <div className="webrtc">
          {muted && <span className="icon muted-icon"><FontAwesomeIcon icon={faMicrophoneSlash} /></span>}
          {deafened && <span className="icon deafened-icon"><FontAwesomeIcon icon={faVolumeMute} /></span>}
          {!tracker.spectraDisabled && !muted && !deafened ? (
            <Spectrum
              width={40}
              height={40}
              audioContext={audioContext}
              ref={spectrumRefCallback}
            />
          ) : null}
        </div>
      </div>
    </OverlayTrigger>
  );

  if (!tracker.rtcConfigReady || !tracker.participantsReady || !tracker.signalsReady) {
    return <div />;
  }

  if (!tracker.rtcConfig) {
    return (
      <div>
        WebRTC misconfigured on the server.  Contact your server administrator.
      </div>
    );
  }

  const callerCount = tracker.participants.length;
  const others = nonSelfParticipants();

  const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;

  return (
    <>
      <div className="av-actions">
        <Button
          variant={muted ? 'secondary' : 'light'}
          size="sm"
          onClick={toggleMuted}
        >
          {muted ? 'unmute' : 'mute self'}
        </Button>
        <Button
          variant={deafened ? 'secondary' : 'light'}
          size="sm"
          onClick={toggleDeafened}
        >
          {deafened ? 'undeafen' : 'deafen self'}
        </Button>
        <Button variant="danger" size="sm" onClick={leaveCall}>leave call</Button>
      </div>
      <div className="chatter-subsection av-chatters">
        <header onClick={onToggleCallersExpanded}>
          <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
          {`${callerCount} caller${callerCount !== 1 ? 's' : ''}`}
        </header>
        <div className={classnames('people-list', { collapsed: !callersExpanded })}>
          {selfBox}
          {tracker.signalsReady && tracker.selfParticipant && others.map((p) => {
            return (
              <CallLinkBox
                key={p._id}
                rtcConfig={tracker.rtcConfig!}
                selfParticipant={tracker.selfParticipant!}
                peerParticipant={p}
                localStream={localStream}
                audioContext={audioContext}
                deafened={deafened}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default RTCCallSection;
