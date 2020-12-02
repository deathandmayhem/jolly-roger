import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { faMicrophone, faHeadphonesAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CallParticipants from '../../lib/models/call_participants';
import { CallParticipantType } from '../../lib/schemas/call_participants';
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
          className="people-item"
        >
          <span className="initial">Me</span>
          <div className="webrtc">
            {this.props.muted && <span className="muted"><FontAwesomeIcon icon={faMicrophone} /></span>}
            {this.props.deafened && <span className="deafened"><FontAwesomeIcon icon={faHeadphonesAlt} /></span>}
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

  return {
    participantsReady: joinSub.ready(),
    selfParticipant,
    participants,
    signalsReady,
    selfUserId,
  };
});

const RTCCallSectionContainer = tracker(RTCCallSection);

export default RTCCallSectionContainer;
