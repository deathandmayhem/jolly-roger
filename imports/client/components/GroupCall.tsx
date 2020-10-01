import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import CallParticipants from '../../lib/models/call_participants';
import { CallParticipantType } from '../../lib/schemas/call_participants';
import CallLink from './CallLink';

const tabId = Random.id();

interface GroupCallParams {
  huntId: string;
  puzzleId: string;
  stream: MediaStream;
}

interface GroupCallProps extends GroupCallParams {
  participantsReady: boolean;
  selfParticipant: CallParticipantType | undefined;
  participants: CallParticipantType[];
  signalsReady: boolean;
}

class GroupCall extends React.Component<GroupCallProps> {
  nonSelfParticipants() {
    return this.props.participants.filter((p) => {
      return (p.createdBy !== Meteor.userId()) || (p.tab !== tabId);
    });
  }

  render() {
    const selfParticipant = this.props.selfParticipant;
    return (
      <div>
        <div>Participants</div>
        <div>
          self:
          {selfParticipant && selfParticipant._id}
        </div>
        {selfParticipant && this.nonSelfParticipants().map((participant) => (
          <CallLink
            key={participant._id}
            selfParticipant={selfParticipant}
            peerParticipant={participant}
            stream={this.props.stream}
          />
        ))}
      </div>
    );
  }
}

const tracker = withTracker((props: GroupCallParams) => {
  const { huntId, puzzleId } = props;
  // No SubsCache for call participants.  This is not usefully cacheable.
  const participantsSub = Meteor.subscribe('call.join', huntId, puzzleId, tabId);
  const participantsReady = participantsSub.ready();
  const participants = participantsReady ? CallParticipants.find({
    hunt: huntId,
    call: puzzleId,
  }).fetch() : [];

  const selfParticipant = participants.find((p) => {
    return p.createdBy === Meteor.userId() && p.tab === tabId;
  });
  let signalsReady;
  if (selfParticipant) {
    const signalsSub = Meteor.subscribe('call.signal', selfParticipant._id);
    signalsReady = signalsSub.ready();
  } else {
    signalsReady = false;
  }

  return {
    participantsReady,
    selfParticipant,
    participants,
    signalsReady,
  };
});

const GroupCallContainer = tracker(GroupCall);

export default GroupCallContainer;
