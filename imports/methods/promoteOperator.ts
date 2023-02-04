import type { HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  targetUserId: string,
  huntId: HuntId
}, void>(
  'Users.method.promoteOperator'
);
