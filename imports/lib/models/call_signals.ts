import CallSignalSchema, { CallSignalType } from '../schemas/call_signal';
import Base from './base';

const CallSignals = new Base<CallSignalType>('call_signals');
CallSignals.attachSchema(CallSignalSchema);
// No publish -- we have custom publication methods in imports/server/calls.ts

export default CallSignals;
