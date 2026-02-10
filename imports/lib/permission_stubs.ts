import { Meteor } from "meteor/meteor";
import type z from "zod";
import isAdmin, { GLOBAL_SCOPE } from "./isAdmin";
import type { HuntType } from "./models/Hunts";
import MeteorUsers from "./models/MeteorUsers";
import type { Selector } from "./models/Model";
import type { User } from "./models/User";

// Explicitly defined roles
type DefinedRole = "hunt_owner" | "operator";

// A list of actions with hunt-specific configurable access control levels.
export type ConfigurableAction =
  | "inviteUsers" // Invite users by email
  | "bulkInviteUsers" // Invite users in batch by email
  | "manageOperators" // Promote or demote operator permissions
  | "manageInvitationLink" // Create, regenerate, or destroy a public invitation link.
  | "editPuzzles" // Add and edit Puzzles within this hunt
  | "deletePuzzles" // Delete a Puzzle within this hunt
  | "operateGuessQueue" // Change the state of a Guess (i.e. to correct or incorrect or partial or rejected, or back to pending) if the operator queue is enabled
  | "sendAnnouncements" // Send an Announcement for this hunt
  | "purgeHunt"; // Purge all data associated with this hunt

// These permission levels are considered hierarchical:
// * a server admin can (at least for now) do anything a hunt owner can;
// * a hunt owner can always do anything an operator can;
// * and an operator can always do anything a member can.
export type RequiredPermissionLevel = "hunt_owner" | "operator" | "member";

// The default required permission level to perform particular actions within a hunt.
export const DEFAULT_PERMISSION_LEVELS: Record<
  ConfigurableAction,
  RequiredPermissionLevel
> = {
  inviteUsers: "operator",
  bulkInviteUsers: "operator",
  manageOperators: "operator",
  manageInvitationLink: "operator",
  editPuzzles: "operator",
  deletePuzzles: "operator",
  operateGuessQueue: "operator",
  sendAnnouncements: "operator",
  purgeHunt: "hunt_owner",
};

export function userHasRoleForHunt(
  user: Pick<Meteor.User, "roles">,
  hunt: Pick<HuntType, "_id">,
  role: DefinedRole,
): boolean {
  const roles = user.roles?.[hunt._id];
  return roles?.includes(role) ?? false;
}

function userIsInHunt(
  user: Pick<Meteor.User, "hunts">,
  hunt: Pick<HuntType, "_id">,
): boolean {
  return user.hunts?.includes(hunt._id) ?? false;
}

function userHasPermissionForAction(
  user: Pick<Meteor.User, "hunts" | "roles">,
  hunt: Pick<HuntType, "_id" | "openSignups">,
  action: ConfigurableAction,
): boolean {
  const hasAdmin = isAdmin(user);
  const hasHuntOwner = userHasRoleForHunt(user, hunt, "hunt_owner");
  const hasHuntOperator = userHasRoleForHunt(user, hunt, "operator");
  const hasHuntMember = userIsInHunt(user, hunt);

  // TODO: allow hunt-level configuration to override this
  const requiredPermission =
    action === "inviteUsers"
      ? hunt.openSignups
        ? "member"
        : "operator"
      : DEFAULT_PERMISSION_LEVELS[action];

  switch (requiredPermission) {
    case "hunt_owner":
      // For now, we allow admins to do anything that a hunt owner can.
      return hasAdmin || hasHuntOwner;
    case "operator":
      // For now, we allow admins to do anything that an operator can.
      // In time, we may wish to confine admin powers.
      // A hunt owner can configure permissions and provision operators,
      // so there's no point in trying to prevent them from taking actions on a
      // hunt.
      return hasAdmin || hasHuntOwner || hasHuntOperator;
    case "member":
      return hasAdmin || hasHuntOwner || hasHuntOperator || hasHuntMember;
    default:
      // biome-ignore lint/nursery/noUnusedExpressions: exhaustive check
      requiredPermission satisfies never;
      return false;
  }
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

  return userHasRoleForHunt(user, hunt, "operator");
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

export function queryOperatorsForHunt(
  hunt: Pick<HuntType, "_id">,
): Selector<z.output<typeof User>> {
  return {
    [`roles.${hunt._id}`]: "operator",
  };
}

export function userMayConfigureHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasRoleForHunt(user, hunt, "hunt_owner");
}

export function userMayAddUsersToHunt(
  user: Pick<Meteor.User, "roles" | "hunts"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "inviteUsers");
}

export function userMayUpdateHuntInvitationCode(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "manageInvitationLink");
}

// Admins and operators may add announcements to a hunt.
export function userMayAddAnnouncementToHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "sendAnnouncements");
}

export function userMayMakeOperatorForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "manageOperators");
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

  if (userHasRoleForHunt(user, hunt, "operator")) {
    return true;
  }

  return false;
}

export function userMayBulkAddToHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "bulkInviteUsers");
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

export function userMayConfigureServerLanguage(
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
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "operateGuessQueue");
}

export function userMayWritePuzzlesForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "editPuzzles");
}

export function userMayDestroyPuzzlesForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "openSignups"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return userHasPermissionForAction(user, hunt, "deletePuzzles");
}

export function userMayCreateHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
}

export function userMayUpdateHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }
  return isAdmin(user) || userHasRoleForHunt(user, hunt, "hunt_owner");
}

export function userMayPurgeHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return isAdmin(user) || userHasRoleForHunt(user, hunt, "hunt_owner");
}

export function userMayJoinCallsForHunt(
  user: Pick<Meteor.User, "roles" | "hunts"> | null | undefined,
  hunt: Pick<HuntType, "_id"> | null | undefined,
): boolean {
  if (!user || !hunt) {
    return false;
  }

  return isAdmin(user) || userIsInHunt(user, hunt);
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
