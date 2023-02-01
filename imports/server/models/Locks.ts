// Locks are a server-only class
import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import Lock from '../schemas/Lock';

const Locks = new Model('jr_locks', Lock);
export type LockType = ModelType<typeof Locks>;

export default Locks;
