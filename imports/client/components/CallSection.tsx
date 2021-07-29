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
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { ProfileType } from '../../lib/schemas/profiles';
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
  const tracker: RTCCallSectionTrackerData = useTracker(() => {
    const joinSub = Meteor.subscribe('call.join', props.huntId, props.puzzleId, props.tabId);
    const participants = joinSub.ready() ? CallParticipants.find({
      hunt: props.huntId,
      call: props.puzzleId,
    }).fetch() : [];

    const rtcConfigSub = Meteor.subscribe('rtcconfig');
    const rtcConfig = RTCConfig.findOne('rtcconfig');

    const selfUserId = Meteor.userId() || undefined;
    const selfProfile = selfUserId ? Profiles.findOne(selfUserId) : undefined;
    const selfParticipant = participants.find((p) => {
      return p.createdBy === selfUserId && p.tab === props.tabId;
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
  }, [props.huntId, props.puzzleId, props.tabId]);

  const nonSelfParticipants = useCallback(() => {
    return tracker.participants.filter((p) => {
      return (p.createdBy !== tracker.selfUserId) || (p.tab !== props.tabId);
    });
  }, [tracker.participants, tracker.selfUserId, props.tabId]);

  const toggleMuted = useCallback(() => {
    props.onToggleMute();
  }, [props.onToggleMute]);

  const toggleDeafened = useCallback(() => {
    props.onToggleDeafen();
  }, [props.onToggleDeafen]);

  const leaveCall = useCallback(() => {
    props.onLeaveCall();
  }, [props.onLeaveCall]);

  const spectrumRefCallback = useCallback((spectrum) => {
    if (spectrum) {
      spectrum.connect(props.localStream);
    }
  }, [props.localStream]);

  const selfProfile = tracker.selfProfile;
  const discordAccount = selfProfile && selfProfile.discordAccount;
  const discordAvatarUrl = discordAccount && getAvatarCdnUrl(discordAccount);
  const initial = selfProfile ? selfProfile.displayName.slice(0, 1) : 'U'; // get it?  it's you
  const selfBox = (
    <OverlayTrigger
      key="self"
      placement="right"
      overlay={(
        <Tooltip id="caller-self">
          <div>You are in the call.</div>
          {props.muted && <div>You are currently muted and will transmit no audio.</div>}
          {props.deafened && <div>You are currently deafened and will hear no audio.</div>}
        </Tooltip>
      )}
    >
      <div
        key="self"
        className={classnames('people-item', {
          muted: props.muted,
          deafened: props.deafened,
          live: !props.muted && !props.deafened,
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
          {props.muted && <span className="icon muted-icon"><FontAwesomeIcon icon={faMicrophoneSlash} /></span>}
          {props.deafened && <span className="icon deafened-icon"><FontAwesomeIcon icon={faVolumeMute} /></span>}
          {!tracker.spectraDisabled && !props.muted && !props.deafened ? (
            <Spectrum
              className="spectrogram"
              width={40}
              height={40}
              audioContext={props.audioContext}
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

  const callersHeaderIcon = props.callersExpanded ? faCaretDown : faCaretRight;

  return (
    <>
      <div className="av-actions">
        <Button
          variant={props.muted ? 'secondary' : 'light'}
          size="sm"
          onClick={toggleMuted}
        >
          {props.muted ? 'unmute' : 'mute self'}
        </Button>
        <Button
          variant={props.deafened ? 'secondary' : 'light'}
          size="sm"
          onClick={toggleDeafened}
        >
          {props.deafened ? 'undeafen' : 'deafen self'}
        </Button>
        <Button variant="danger" size="sm" onClick={leaveCall}>leave call</Button>
      </div>
      <div className="chatter-subsection av-chatters">
        <header onClick={props.onToggleCallersExpanded}>
          <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
          {`${callerCount} caller${callerCount !== 1 ? 's' : ''}`}
        </header>
        <div className={classnames('people-list', { collapsed: !props.callersExpanded })}>
          {selfBox}
          {tracker.signalsReady && tracker.selfParticipant && others.map((p) => {
            return (
              <CallLinkBox
                key={p._id}
                rtcConfig={tracker.rtcConfig!}
                selfParticipant={tracker.selfParticipant!}
                peerParticipant={p}
                localStream={props.localStream}
                audioContext={props.audioContext}
                deafened={props.deafened}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default RTCCallSection;
