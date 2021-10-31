import { huntsMatchingCurrentUser } from '../../model-helpers';
import CallParticipantSchema, { CallParticipantType } from '../schemas/call_participant';
import Base from './base';

const CallParticipants = new Base<CallParticipantType>('call_participants');
CallParticipants.attachSchema(CallParticipantSchema);
CallParticipants.publish(huntsMatchingCurrentUser);

export default CallParticipants;
