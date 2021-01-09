import { huntsMatchingCurrentUser } from '../../model-helpers';
import CallParticipantsSchema, { CallParticipantType } from '../schemas/call_participants';
import Base from './base';

const CallParticipants = new Base<CallParticipantType>('call_participants');
CallParticipants.attachSchema(CallParticipantsSchema);
CallParticipants.publish(huntsMatchingCurrentUser);

export default CallParticipants;
