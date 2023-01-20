import { Mongo } from 'meteor/mongo';
import type { CallHistoryType } from '../../schemas/mediasoup/CallHistory';

const CallHistories = new Mongo.Collection<CallHistoryType>('jr_mediasoup_call_histories');

export default CallHistories;
