import { z } from "zod";

// Explicitly defined roles
export type DefinedRole = "hunt_owner" | "operator";

// The universe of per-hunt actions that can have their required permissions configured
export const ConfigurableActionEnum = z.enum([
  "inviteUsers", // Invite users by email
  "bulkInviteUsers", // Invite users in batch by email
  "manageOperators", // Promote or demote operator permissions
  "manageInvitationLink", // Create, regenerate, or destroy a public invitation link.
  "editPuzzles", // Add and edit Puzzles within this hunt
  "deletePuzzles", // Delete a Puzzle within this hunt
  "operateGuessQueue", // Change the state of a Guess (i.e. to correct or incorrect or partial or rejected, or back to pending) if the operator queue is enabled
  "sendAnnouncements", // Send an Announcement for this hunt
  "purgeHunt", // Purge all data associated with this hunt
]);

export type ConfigurableAction = z.infer<typeof ConfigurableActionEnum>;

// The possible level of permission a caller can possess for a particular context
// These permission levels are considered hierarchical:
// * a server admin can (at least for now) do anything a hunt owner can;
// * a hunt owner can always do anything an operator can;
// * an operator can always do anything a member can;
// * a member can do anything a non-member/anonymous user can.
export const EffectivePermissionLevelEnum = z.enum([
  "admin",
  "hunt_owner",
  "operator",
  "member",
  "none",
]);

// The possible level of permission required that can be configured for a
// configurable action in the context of a hunt.
export const ConfiguredPermissionLevelEnum = z.enum([
  "hunt_owner",
  "operator",
  "member",
]);
export type ConfiguredPermissionLevel = z.infer<
  typeof ConfiguredPermissionLevelEnum
>;
export type EffectivePermissionLevel = z.infer<
  typeof EffectivePermissionLevelEnum
>;
