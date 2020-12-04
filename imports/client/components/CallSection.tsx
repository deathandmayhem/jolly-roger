import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { faMicrophone, faHeadphonesAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Flags from '../../flags';
import CallParticipants from '../../lib/models/call_participants';
import Profiles from '../../lib/models/profiles';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import { ProfileType } from '../../lib/schemas/profiles';
import CallLinkBox from './CallLinkBox';
import Spectrum from './Spectrum';

interface RTCCallSectionParams {
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
}

interface RTCCallSectionProps extends RTCCallSectionParams {
  participantsReady: boolean;
  participants: CallParticipantType[];
  selfParticipant: CallParticipantType | undefined;
  signalsReady: boolean;
  selfUserId: string | undefined;
  selfProfile: ProfileType | undefined;
  spectraDisabled: boolean;
}

class RTCCallSection extends React.Component<RTCCallSectionProps> {
  nonSelfParticipants = () => {
    return this.props.participants.filter((p) => {
      return (p.createdBy !== this.props.selfUserId) || (p.tab !== this.props.tabId);
    });
  }

  toggleMuted = () => {
    this.props.onToggleMute();
  };

  toggleDeafened = () => {
    this.props.onToggleDeafen();
  };

  leaveCall = () => {
    this.props.onLeaveCall();
  };

  renderSelfBox = () => {
    const selfProfile = this.props.selfProfile;
    const initial = selfProfile ? selfProfile.displayName.slice(0, 1) : 'U'; // get it?  it's you
    return (
      <OverlayTrigger
        key="self"
        placement="right"
        overlay={(
          <Tooltip id="caller-self">
            <div>You are in the call.</div>
            {this.props.muted && <div>You are currently muted and will transmit no audio.</div>}
            {this.props.deafened && <div>You are currently deafened and will hear no audio.</div>}
          </Tooltip>
        )}
      >
        <div
          key="self"
          className={classnames('people-item', {
            muted: this.props.muted,
            deafened: this.props.deafened,
            live: !this.props.muted && !this.props.deafened,
          })}
        >
          <span className="initial">{initial}</span>
          <div className="webrtc">
            {this.props.muted && <span className="icon muted-icon"><FontAwesomeIcon icon={faMicrophone} /></span>}
            {this.props.deafened && <span className="icon deafened-icon"><FontAwesomeIcon icon={faHeadphonesAlt} /></span>}
            {!this.props.spectraDisabled && !this.props.muted && !this.props.deafened ? (
              <Spectrum
                className="spectrogram"
                width={40}
                height={40}
                audioContext={this.props.audioContext}
                ref={((spectrum) => {
                  if (spectrum) {
                    spectrum.connect(this.props.localStream);
                  }
                }
                )}
              />
            ) : null}
          </div>
        </div>
      </OverlayTrigger>
    );
  };

  render() {
    if (!this.props.participantsReady || !this.props.signalsReady) {
      return <div />;
    }

    const callerCount = this.props.participants.length;
    const others = this.nonSelfParticipants();

    return (
      <>
        <div className="av-actions">
          <Button
            variant={this.props.muted ? 'secondary' : 'light'}
            size="sm"
            onClick={this.toggleMuted}
          >
            {this.props.muted ? 'unmute' : 'mute self'}
          </Button>
          <Button
            variant={this.props.deafened ? 'secondary' : 'light'}
            size="sm"
            onClick={this.toggleDeafened}
          >
            {this.props.deafened ? 'undeafen' : 'deafen self'}
          </Button>
          <Button variant="danger" size="sm" onClick={this.leaveCall}>leave call</Button>
        </div>
        <div className="chatter-subsection av-chatters">
          <header>
            {`${callerCount} caller${callerCount !== 1 ? 's' : ''}`}
          </header>
          <div className="people-list">
            {this.renderSelfBox()}
            {this.props.signalsReady && this.props.selfParticipant && others.map((p) => {
              return (
                <CallLinkBox
                  key={p._id}
                  selfParticipant={this.props.selfParticipant!}
                  peerParticipant={p}
                  localStream={this.props.localStream}
                  audioContext={this.props.audioContext}
                  deafened={this.props.deafened}
                />
              );
            })}
          </div>
        </div>
      </>
    );
  }
}

// This exists just to apply React lifecycle treatment to this subscribe.
const tracker = withTracker((params: RTCCallSectionParams) => {
  const joinSub = Meteor.subscribe('call.join', params.huntId, params.puzzleId, params.tabId);
  const participants = joinSub.ready() ? CallParticipants.find({
    hunt: params.huntId,
    call: params.puzzleId,
  }).fetch() : [];

  const selfUserId = Meteor.userId() || undefined;
  const selfProfile = selfUserId ? Profiles.findOne(selfUserId) : undefined;
  const selfParticipant = participants.find((p) => {
    return p.createdBy === selfUserId && p.tab === params.tabId;
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
    participantsReady: joinSub.ready(),
    selfParticipant,
    selfProfile,
    participants,
    signalsReady,
    selfUserId,
    spectraDisabled,
  };
});

const RTCCallSectionContainer = tracker(RTCCallSection);

export default RTCCallSectionContainer;
