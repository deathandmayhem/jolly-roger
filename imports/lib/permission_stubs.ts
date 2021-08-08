import { Meteor } from 'meteor/meteor';
import Hunts from './models/hunts';
import MeteorUsers from './models/meteor_users';

// admins are always allowed to join someone to a hunt
// non-admins (including operators) can if they are a member of that hunt
// already and if the hunt allows open signups.
// It's possible we should always allow operators to add someone to a hunt?
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

function isActiveOperatorForHunt(user: Meteor.User, _huntId: string): boolean {
  if (user.roles && user.roles.includes('operator')) {
    return true;
  }

  return false;
}

// Admins and active operators may add announcements to a hunt.
export function userMayAddAnnouncementToHunt(
  userId: string | null | undefined, huntId: string
): boolean {
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

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  if (isActiveOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}
