import type { HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: HuntId, message: string }, void>(
  'Announcements.methods.post'
);
