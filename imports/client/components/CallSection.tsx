import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Button from 'react-bootstrap/Button';
import CallParticipants from '../../lib/models/call_participants';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import CallLinkBox from './CallLinkBox';

const tabId = Random.id();

interface RTCCallSectionParams {
  huntId: string;
  puzzleId: string;
  onLeaveCall(): void;
  onToggleMute(): void;
  muted: boolean;
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

interface RTCCallSectionState {
  deafened: boolean;
}

class RTCCallSection extends React.Component<RTCCallSectionProps, RTCCallSectionState> {
  constructor(props: RTCCallSectionProps) {
    super(props);

    this.state = {
      deafened: false,
    };
  }

  nonSelfParticipants = () => {
    return this.props.participants.filter((p) => {
      return (p.createdBy !== this.props.selfUserId) || (p.tab !== tabId);
    });
  }

  toggleMuted = () => {
    this.props.onToggleMute();
  };

  toggleDeafened = () => {
    this.setState((prevState) => ({
      deafened: !prevState.deafened,
    }));
  };

  leaveCall = () => {
    this.props.onLeaveCall();
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
            {this.props.muted ? 'muted' : 'mute'}
          </Button>
          <Button
            variant={this.state.deafened ? 'secondary' : 'light'}
            size="sm"
            onClick={this.toggleDeafened}
          >
            {this.state.deafened ? 'deafened' : 'deafen'}
          </Button>
          <Button variant="danger" size="sm" onClick={this.leaveCall}>leave call</Button>
        </div>
        <div className="chatter-subsection av-chatters">
          <header>
            {`${callerCount} caller${callerCount !== 1 ? 's' : ''}`}
          </header>
          <div className="people-list">
            <div
              key="self"
              className="people-item"
            >
              <span className="initial">Me</span>
            </div>
            {this.props.signalsReady && this.props.selfParticipant && others.map((p) => {
              return (
                <CallLinkBox
                  key={p._id}
                  selfParticipant={this.props.selfParticipant!}
                  peerParticipant={p}
                  localStream={this.props.localStream}
                  audioContext={this.props.audioContext}
                  deafened={this.state.deafened}
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
  const joinSub = Meteor.subscribe('call.join', params.huntId, params.puzzleId, tabId);
  const participants = joinSub.ready() ? CallParticipants.find({
    hunt: params.huntId,
    call: params.puzzleId,
  }).fetch() : [];

  const selfUserId = Meteor.userId() || undefined;
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
