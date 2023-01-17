import type { Meteor } from 'meteor/meteor';

export const GLOBAL_SCOPE = '__GLOBAL__';

// These are in a separate file to avoid circular dependencies, since
// imports/lib/models/base.ts wants to use it for the global admin allow rules,
// but permission_stubs accesses some other Base-derived collections.

export default function isAdmin(user: Meteor.User | null | undefined): boolean {
  return user?.roles?.[GLOBAL_SCOPE]?.includes('admin') ?? false;
}
