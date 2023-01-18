import { Meteor } from 'meteor/meteor';
import isAdmin, { GLOBAL_SCOPE } from './isAdmin';
import MeteorUsers from './models/MeteorUsers';
import type { HuntType } from './schemas/Hunt';

function isOperatorForHunt(user: Meteor.User, hunt: HuntType): boolean {
  return user.roles?.[hunt._id]?.includes('operator') ?? false;
}

export function listAllRolesForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): string[] {
  if (!user?.roles || !hunt) {
    return [];
  }

  return [
    ...user.roles[GLOBAL_SCOPE] ?? [],
    ...user.roles[hunt._id] ?? [],
  ];
}

export function userIsOperatorForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return isOperatorForHunt(user, hunt);
}

export function userIsOperatorForAnyHunt(user: Meteor.User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  return Object.entries(user.roles ?? {}).some(([huntId, roles]) => huntId !== GLOBAL_SCOPE && roles.includes('operator'));
}

// admins and operators are always allowed to join someone to a hunt
// non-admins can if they are a member of that hunt
// already and if the hunt allows open signups.
export function userMayAddUsersToHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  // Admins can always do everything
  if (isAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, hunt)) {
    return true;
  }

  // You can only add users to a hunt if you're already a member of said hunt.
  const joinedHunts = user.hunts;
  if (!joinedHunts) {
    return false;
  }

  if (!joinedHunts.includes(hunt._id)) {
    return false;
  }

  return hunt.openSignups;
}

// Admins and operators may add announcements to a hunt.
export function userMayAddAnnouncementToHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, hunt)) {
    return true;
  }

  return false;
}

export function userMayMakeOperatorForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, hunt)) {
    return true;
  }

  return false;
}

export function userMaySeeUserInfoForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, hunt)) {
    return true;
  }

  return false;
}

export function userMayBulkAddToHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isOperatorForHunt(user, hunt)) {
    return true;
  }

  return false;
}

export function userMayUseDiscordBotAPIs(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function checkAdmin(user: Meteor.User | null | undefined) {
  if (!isAdmin(user)) {
    throw new Meteor.Error(401, 'Must be admin');
  }
}

export function userMayConfigureGdrive(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureGoogleOAuth(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureDiscordOAuth(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureDiscordBot(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureEmailBranding(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureTeamName(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayConfigureAssets(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayUpdateGuessesForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }
  if (isAdmin(user)) {
    return true;
  }
  if (isOperatorForHunt(user, hunt)) {
    return true;
  }
  return false;
}

export function userMayWritePuzzlesForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }
  if (isAdmin(user)) {
    return true;
  }
  if (isOperatorForHunt(user, hunt)) {
    return true;
  }
  return false;
}

export function userMayCreateHunt(user: Meteor.User | null | undefined): boolean {
  return isAdmin(user);
}

export function userMayUpdateHunt(
  user: Meteor.User | null | undefined,
  _hunt: HuntType | null | undefined,
): boolean {
  // TODO: make this driven by if you're an operator of the hunt in question
  return isAdmin(user);
}

export function userMayJoinCallsForHunt(
  user: Meteor.User | null | undefined,
  hunt: HuntType | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }
  if (isAdmin(user)) {
    return true;
  }
  if (user.hunts?.includes(hunt._id)) {
    return true;
  }
  return false;
}

export async function addUserToRole(userId: string, scope: string, role: string) {
  await MeteorUsers.updateAsync({
    _id: userId,
  }, {
    $addToSet: {
      [`roles.${scope}`]: {
        $each: [role],
      },
    },
  });
}

export async function addUserToRoles(userId: string, scope: string, roles: string[]) {
  await MeteorUsers.updateAsync({
    _id: userId,
  }, {
    $addToSet: {
      [`roles.${scope}`]: {
        $each: roles,
      },
    },
  });
}

export async function removeUserFromRole(userId: string, scope: string, role: string) {
  await MeteorUsers.updateAsync({
    _id: userId,
  }, {
    $pullAll: {
      [`roles.${scope}`]: [role],
    },
  });
}

export async function removeUserFromRoles(userId: string, scope: string, roles: string[]) {
  await MeteorUsers.updateAsync({
    _id: userId,
  }, {
    $pullAll: {
      [`roles.${scope}`]: roles,
    },
  });
}
