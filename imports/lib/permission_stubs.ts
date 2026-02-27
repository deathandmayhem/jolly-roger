import { Meteor } from "meteor/meteor";
import type { z } from "zod";
import isAdmin, { GLOBAL_SCOPE } from "./isAdmin";
import type { HuntType } from "./models/Hunts";
import MeteorUsers from "./models/MeteorUsers";
import type { Selector } from "./models/Model";
import type { User } from "./models/User";
import type {
  ConfigurableAction,
  ConfiguredPermissionLevel,
  DefinedRole,
} from "./permissions";

type EffectivePermissionLevel = "admin" | ConfiguredPermissionLevel | "none";

// The default required permission level to perform particular actions within a hunt.
export const DEFAULT_PERMISSION_LEVELS: Record<
  ConfigurableAction,
  ConfiguredPermissionLevel
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
  huntId: string,
  role: DefinedRole,
): boolean {
  const roles = user.roles?.[huntId];
  return roles?.includes(role) ?? false;
}

export function userIsInHunt(
  user: Pick<Meteor.User, "hunts">,
  huntId: string,
): boolean {
  return user.hunts?.includes(huntId) ?? false;
}

export function requiredPermissionForAction(
  hunt: Pick<HuntType, "_id" | "customPermissions">,
  action: ConfigurableAction,
): ConfiguredPermissionLevel {
  return (hunt.customPermissions ?? DEFAULT_PERMISSION_LEVELS)[action];
}

function effectivePermissionLevelForHunt(
  user: Pick<Meteor.User, "hunts" | "roles">,
  huntId: string,
): EffectivePermissionLevel {
  if (isAdmin(user)) {
    return "admin";
  } else if (userHasRoleForHunt(user, huntId, "hunt_owner")) {
    return "hunt_owner";
  } else if (userHasRoleForHunt(user, huntId, "operator")) {
    return "operator";
  } else if (userIsInHunt(user, huntId)) {
    return "member";
  } else {
    return "none";
  }
}

function effectivePermissionCoversRequiredPermission(
  effectiveLevel: EffectivePermissionLevel,
  requiredLevel: ConfiguredPermissionLevel,
): boolean {
  switch (requiredLevel) {
    case "hunt_owner":
      return effectiveLevel === "admin" || effectiveLevel === "hunt_owner";
    case "operator":
      return (
        effectiveLevel === "admin" ||
        effectiveLevel === "hunt_owner" ||
        effectiveLevel === "operator"
      );
    case "member":
      return (
        effectiveLevel === "admin" ||
        effectiveLevel === "hunt_owner" ||
        effectiveLevel === "operator" ||
        effectiveLevel === "member"
      );
    default:
      // biome-ignore lint/nursery/noUnusedExpressions: exhaustive check
      requiredLevel satisfies never;
      return false;
  }
}

// This function is intended to be a convenient one-liner to call from method implementations
// to ensure that we perform the appropriate checks for the action and also explain the error
// along with the required permission level to perform the action.
export function checkUserHasPermissionForAction(
  user: Pick<Meteor.User, "hunts" | "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "customPermissions"> | null | undefined,
  action: ConfigurableAction,
) {
  if (!user) {
    throw new Meteor.Error(
      401,
      `Logged-out user may not perform action ${action}`,
    );
  }
  if (!hunt) {
    throw new Meteor.Error(404, "No such hunt");
  }

  const required = requiredPermissionForAction(hunt, action);
  const effective = effectivePermissionLevelForHunt(user, hunt._id);
  if (!effectivePermissionCoversRequiredPermission(effective, required)) {
    throw new Meteor.Error(
      401,
      `Action ${action} on hunt ${hunt._id} requires "${required}" privilege but you only have "${effective}" privilege`,
    );
  }
}

// This function is intended to be used conveniently in contexts where we want
// to know if a user may take an action so we can show UI for it or not.
export function userHasPermissionForAction(
  user: Pick<Meteor.User, "hunts" | "roles"> | null | undefined,
  hunt: Pick<HuntType, "_id" | "customPermissions"> | null | undefined,
  action: ConfigurableAction,
): boolean {
  if (!user || !hunt) {
    return false;
  }
  const required = requiredPermissionForAction(hunt, action);
  const effective = effectivePermissionLevelForHunt(user, hunt._id);
  return effectivePermissionCoversRequiredPermission(effective, required);
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
  huntId: string,
): boolean {
  if (!user) {
    return false;
  }

  return userHasRoleForHunt(user, huntId, "hunt_owner");
}

export function userMaySeeUserInfoForHunt(
  user: Pick<Meteor.User, "roles"> | null | undefined,
  huntId: string,
): boolean {
  if (!user) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (userHasRoleForHunt(user, huntId, "operator")) {
    return true;
  }

  return false;
}

export function checkAdmin(
  user: Pick<Meteor.User, "roles"> | null | undefined,
) {
  if (!isAdmin(user)) {
    throw new Meteor.Error(401, "Must be admin");
  }
}

export function userMayUseDiscordBotAPIs(
  user: Pick<Meteor.User, "roles"> | null | undefined,
): boolean {
  return isAdmin(user);
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
  return isAdmin(user) || userHasRoleForHunt(user, hunt._id, "hunt_owner");
}

export function userMayJoinCallsForHunt(
  user: Pick<Meteor.User, "roles" | "hunts"> | null | undefined,
  huntId: string,
): boolean {
  if (!user) {
    return false;
  }

  return isAdmin(user) || userIsInHunt(user, huntId);
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
