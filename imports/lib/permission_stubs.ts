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
  // Today, this function doesn't consider the huntId scope, but some day, we'd like it to.
  if (user.roles && user.roles.includes('operator')) {
    return true;
  }

  return false;
}

function isInactiveOperatorForHunt(user: Meteor.User, _huntId: string): boolean {
  // Today, this function doesn't consider the huntId scope, but some day, we'd like it to.
  if (user.roles && user.roles.includes('inactiveOperator')) {
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

export function userMayMakeOtherUserOperatorForHunt(
  userId: string | null | undefined, otherUserId: string, huntId: string
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

  const otherUser = MeteorUsers.findOne(otherUserId);
  if (!otherUser) {
    return false;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  if (isActiveOperatorForHunt(user, huntId) || isInactiveOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}

export function deprecatedUserMayMakeOperator(userId: string | null | undefined): boolean {
  // TODO: move away from this in favor of hunt-scoped operator status
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

  if (user.roles && (user.roles.includes('inactiveOperator') || user.roles.includes('operator'))) {
    return true;
  }

  return false;
}

export function userMayBulkAddToHunt(userId: string | null | undefined, huntId: string): boolean {
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

  if (isActiveOperatorForHunt(user, huntId) || isInactiveOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}
