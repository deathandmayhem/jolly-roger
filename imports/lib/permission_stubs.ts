import { Meteor } from "meteor/meteor";
import isAdmin, { GLOBAL_SCOPE } from "./isAdmin";
import type { HuntType } from "./models/Hunts";
import MeteorUsers from "./models/MeteorUsers";

function isOperatorForHunt(
  user: Pick<Meteor.User, "roles">,
  hunt: Pick<HuntType, "_id">,
): boolean {
  return user.roles?.[hunt._id]?.includes("operator") ?? false;
}

export function listAllRolesForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): string[] {
  if (!user?.roles || !hunt) {
    return [];
  }

  return [...(user.roles[GLOBAL_SCOPE] ?? []), ...(user.roles[hunt._id] ?? [])];
}

export function userIsOperatorForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return isOperatorForHunt(user, hunt);
}

export function huntsUserIsOperatorFor(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): Set<string> {
  if (!user?.roles) {
    return new Set();
  }

  return Object.entries(user.roles)
    .filter(
      ([huntId, roles]) =>
        huntId !== GLOBAL_SCOPE && roles?.includes("operator"),
    )
    .reduce((acc, [huntId]) => {
      acc.add(huntId);
      return acc;
    }, new Set<string>());
}

// admins and operators are always allowed to join someone to a hunt
// non-admins can if they are a member of that hunt
// already and if the hunt allows open signups.
export function userMayAddUsersToHunt(
  user: Pick<Meteor.User, "roles" | "hunts"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
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

export function userMayUpdateHuntInvitationCode(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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

// Admins and operators may add announcements to a hunt.
export function userMayAddAnnouncementToHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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

export function userMayUseDiscordBotAPIs(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function checkAdmin(
  user: Pick<Meteor.User, "roles"> | null | undefined,
) {
  if (!isAdmin(user)) {
    throw new Meteor.Error(401, "Must be admin");
  }
}

export function userMayConfigureGdrive(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureGoogleOAuth(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureAWS(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureDiscordOAuth(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureDiscordBot(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureEmailBranding(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureTeamName(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayConfigureAssets(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayUpdateGuessesForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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

export function userMayCreateHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayUpdateHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  _hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  // TODO: make this driven by if you're an operator of the hunt in question
  return isAdmin(user);
}

export function userMayJoinCallsForHunt(
  user: Pick<Meteor.User, "roles" | "hunts"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
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

export async function addUserToRole(
  userId: string,
  scope: string,
  role: string,
) {
  await MeteorUsers.updateAsync(
    {
      _id: userId,
    },
    {
      $addToSet: {
        [`roles.${scope}`]: {
          $each: [role],
        },
      },
    },
  );
}

export async function addUserToRoles(
  userId: string,
  scope: string,
  roles: string[],
) {
  await MeteorUsers.updateAsync(
    {
      _id: userId,
    },
    {
      $addToSet: {
        [`roles.${scope}`]: {
          $each: roles,
        },
      },
    },
  );
}

export async function removeUserFromRole(
  userId: string,
  scope: string,
  role: string,
) {
  await MeteorUsers.updateAsync(
    {
      _id: userId,
    },
    {
      $pullAll: {
        [`roles.${scope}`]: [role],
      },
    },
  );
}

export async function removeUserFromRoles(
  userId: string,
  scope: string,
  roles: string[],
) {
  await MeteorUsers.updateAsync(
    {
      _id: userId,
    },
    {
      $pullAll: {
        [`roles.${scope}`]: roles,
      },
    },
  );
}
