import { Roles } from 'meteor/nicolaslopezj:roles';
import { huntsMatchingCurrentUser } from '../../model-helpers';
import CallParticipantsSchema, { CallParticipantType } from '../schemas/call_participants';
import Base from './base';

const CallParticipants = new Base<CallParticipantType>('call_participants');
CallParticipants.attachSchema(CallParticipantsSchema);
CallParticipants.publish(huntsMatchingCurrentUser);

// TODO: these ACLs need work
// Users can hang up calls they are a part of
Roles.loggedInRole.allow('mongo.call_participants.remove', (uid, doc) => {
  return doc.createdBy === uid;
});

export default CallParticipants;
