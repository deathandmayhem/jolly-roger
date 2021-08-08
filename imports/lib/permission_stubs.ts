import Hunts from './models/hunts';
import MeteorUsers from './models/meteor_users';

// admins are always allowed to join someone to a hunt
// non-admins (including operators) can if they are a member of that hunt
// already and if the hunt allows open signups.
// It's possible we should always allow operators to add someone to a hunt?
// eslint-disable-next-line import/prefer-default-export
export function userMayAddUsersToHunt(userId: string | null | undefined, huntId: string): boolean {
  if (!userId) {
    return false;
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  // Admins can always do everything
  if (user.roles && user.roles.includes('admin')) {
    return true;
  }

  // You can only add users to a hunt if you're already a member of said hunt.
  const joinedHunts = user.hunts;
  if (!joinedHunts) {
    return false;
  }

  if (!joinedHunts.includes(huntId)) {
    return false;
  }

  // You can only add users to a hunt that actually exists.
  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  return hunt.openSignups;
}
