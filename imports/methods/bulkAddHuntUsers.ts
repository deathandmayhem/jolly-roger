import type { HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: HuntId, emails: string[] }, void>(
  'Hunts.methods.bulkAddUsers'
);
