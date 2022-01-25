import { Meteor } from 'meteor/meteor';
import MeteorUsers from './models/MeteorUsers';

export const GLOBAL_SCOPE = '__GLOBAL__';

// These are in a separate file to avoid circular dependencies, since
// imports/lib/models/base.ts wants to use it for the global admin allow rules,
// but permission_stubs accesses some other Base-derived collections.

export function userIsAdmin(user: Meteor.User): boolean {
  return user.roles?.[GLOBAL_SCOPE]?.includes('admin') ?? false;
}

export function userIdIsAdmin(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }
  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  return userIsAdmin(user);
}
