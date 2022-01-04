import { Meteor } from 'meteor/meteor';
import isAdmin from './is-admin';
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
  userId: string | null | undefined,
  huntId: string,
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
  userId: string | null | undefined,
  otherUserId: string,
  huntId: string,
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

export function deprecatedIsActiveOperator(userId: string | null | undefined): boolean {
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

  if (user.roles && user.roles.includes('operator')) {
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

export function userMayUseDiscordBotAPIs(userId: string | null | undefined): boolean {
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

  // TODO: we should figure out more sensible policy here if we want to support
  // general hunt creation
  if (user.roles && user.roles.includes('operator')) {
    return true;
  }

  return false;
}

export function checkAdmin(userId: string | null | undefined) {
  if (!isAdmin(userId)) {
    throw new Meteor.Error(401, 'Must be admin');
  }
}

export function userMayConfigureGdrive(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureGoogleOAuth(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureDiscordOAuth(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureDiscordBot(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureEmailBranding(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureTeamName(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayConfigureAssets(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayUpdateGuessesForHunt(
  userId: string | null | undefined,
  huntId: string,
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
  if (isActiveOperatorForHunt(user, huntId)) {
    return true;
  }
  return false;
}

export function userMayWritePuzzlesForHunt(
  userId: string | null | undefined,
  huntId: string,
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
  if (isActiveOperatorForHunt(user, huntId)) {
    return true;
  }
  return false;
}

export function userMayCreateHunt(userId: string | null | undefined): boolean {
  return isAdmin(userId);
}

export function userMayUpdateHunt(userId: string | null | undefined, _huntId: string): boolean {
  // TODO: make this driven by if you're an operator of the hunt in question
  return isAdmin(userId);
}

export function userMayJoinCallsForHunt(
  userId: string | null | undefined,
  huntId: string,
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
  if (user.hunts && user.hunts.includes(huntId)) {
    return true;
  }
  return false;
}

export function addUserToRole(userId: string, role: string) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $addToSet: {
      roles: {
        $each: [role],
      },
    },
  });
}

export function addUserToRoles(userId: string, roles: string[]) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $addToSet: {
      roles: {
        $each: roles,
      },
    },
  });
}

export function removeUserFromRole(userId: string, role: string) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $pullAll: {
      roles: [role],
    },
  });
}

export function removeUserFromRoles(userId: string, roles: string[]) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $pullAll: {
      roles,
    },
  });
}

if (Meteor.isServer) {
  Meteor.publish('roles', function () {
    if (!this.userId) {
      return [];
    }

    return MeteorUsers.find({
      _id: this.userId,
    }, {
      fields: {
        roles: 1,
      },
    });
  });
}

if (Meteor.isClient) {
  Meteor.subscribe('roles');
}
