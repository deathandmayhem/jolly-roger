import CallSignalsSchema, { CallSignalType } from '../schemas/call_signals';
import Base from './base';

const CallSignals = new Base<CallSignalType>('call_signals');
CallSignals.attachSchema(CallSignalsSchema);
// No publish -- we have custom publication methods in imports/server/calls.ts

export default CallSignals;
