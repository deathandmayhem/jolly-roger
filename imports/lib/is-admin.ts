import MeteorUsers from './models/meteor_users';

// This is in a separate file to avoid circular dependencies, since
// imports/lib/models/base.ts wants to use it for the global admin allow rules,
// but permission_stubs accesses some other Base-derived collections.
function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }
  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }
  if (user.roles && user.roles.includes('admin')) {
    return true;
  }
  return false;
}

export default isAdmin;
