import CallHistory from '../../schemas/mediasoup/CallHistory';
import type { ModelType } from '../Model';
import Model from '../Model';

const CallHistories = new Model('jr_mediasoup_call_histories', CallHistory);
export type CallHistoryType = ModelType<typeof CallHistories>;

export default CallHistories;
