import { Meteor } from 'meteor/meteor';
import { GLOBAL_SCOPE, userIdIsAdmin, userIsAdmin } from './is-admin';
import Hunts from './models/Hunts';
import MeteorUsers from './models/MeteorUsers';

function isOperatorForHunt(user: Meteor.User, huntId: string): boolean {
  return user.roles?.[huntId]?.includes('operator') ?? false;
}

export function listAllRolesForHunt(userId: string | null | undefined, huntId: string): string[] {
  if (!userId) {
    return [];
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return [];
  }

  if (!user.roles) {
    return [];
  }

  return [
    ...user.roles[GLOBAL_SCOPE] ?? [],
    ...user.roles[huntId] ?? [],
  ];
}

export function userIsOperatorForHunt(userId: string | null | undefined, huntId: string): boolean {
  if (!userId) {
    return false;
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  return isOperatorForHunt(user, huntId);
}

export function userIsOperatorForAnyHunt(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  if (userIsAdmin(user)) {
    return true;
  }

  return Object.entries(user.roles ?? {}).some(([huntId, roles]) => huntId !== GLOBAL_SCOPE && roles.includes('operator'));
}

// admins and operators are always allowed to join someone to a hunt
// non-admins can if they are a member of that hunt
// already and if the hunt allows open signups.
export function userMayAddUsersToHunt(userId: string | null | undefined, huntId: string): boolean {
  if (!userId) {
    return false;
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  // Admins can always do everything
  if (userIsAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, huntId)) {
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

// Admins and operators may add announcements to a hunt.
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

  if (userIsAdmin(user)) {
    return true;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  if (isOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}

export function userMayMakeOperatorForHunt(
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

  if (userIsAdmin(user)) {
    return true;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  if (isOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}

export function userMaySeeUserInfoForHunt(
  userId: string | null | undefined,
  huntId: string
): boolean {
  if (!userId) {
    return false;
  }

  const user = MeteorUsers.findOne(userId);
  if (!user) {
    return false;
  }

  if (userIsAdmin(user)) {
    return true;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  if (isOperatorForHunt(user, huntId)) {
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

  if (userIsAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, huntId)) {
    return true;
  }

  return false;
}

export function userMayUseDiscordBotAPIs(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function checkAdmin(userId: string | null | undefined) {
  if (!userIdIsAdmin(userId)) {
    throw new Meteor.Error(401, 'Must be admin');
  }
}

export function userMayConfigureGdrive(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureGoogleOAuth(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureDiscordOAuth(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureDiscordBot(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureEmailBranding(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureTeamName(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayConfigureAssets(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
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
  if (userIsAdmin(user)) {
    return true;
  }
  if (isOperatorForHunt(user, huntId)) {
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
  if (userIsAdmin(user)) {
    return true;
  }
  if (isOperatorForHunt(user, huntId)) {
    return true;
  }
  return false;
}

export function userMayCreateHunt(userId: string | null | undefined): boolean {
  return userIdIsAdmin(userId);
}

export function userMayUpdateHunt(userId: string | null | undefined, _huntId: string): boolean {
  // TODO: make this driven by if you're an operator of the hunt in question
  return userIdIsAdmin(userId);
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
  if (userIsAdmin(user)) {
    return true;
  }
  if (user.hunts?.includes(huntId)) {
    return true;
  }
  return false;
}

export function addUserToRole(userId: string, scope: string, role: string) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $addToSet: {
      [`roles.${scope}`]: {
        $each: [role],
      },
    },
  });
}

export function addUserToRoles(userId: string, scope: string, roles: string[]) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $addToSet: {
      [`roles.${scope}`]: {
        $each: roles,
      },
    },
  });
}

export function removeUserFromRole(userId: string, scope: string, role: string) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $pullAll: {
      [`roles.${scope}`]: [role],
    },
  });
}

export function removeUserFromRoles(userId: string, scope: string, roles: string[]) {
  return MeteorUsers.update({
    _id: userId,
  }, {
    $pullAll: {
      [`roles.${scope}`]: roles,
    },
  });
}
