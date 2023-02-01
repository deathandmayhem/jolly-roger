// Locks are a server-only class
import { Mongo } from 'meteor/mongo';
import type { LockType } from '../schemas/Lock';

const Locks = new Mongo.Collection<LockType>('jr_locks');

export default Locks;
