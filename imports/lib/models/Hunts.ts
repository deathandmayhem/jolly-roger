import { Match } from "meteor/check";
import { z } from "zod";
import { ConfiguredPermissionLevelEnum } from "../permissions";
import { nonEmptyString, snowflake } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

export const SavedDiscordObjectFields = z.object({
  id: snowflake,
  name: nonEmptyString,
});

export type SavedDiscordObjectType = z.infer<typeof SavedDiscordObjectFields>;

// TODO: the following definition doesn't work quite right under zod 3 because zod 3's record type is not exhaustive.
// Switch to this once we update to zod 4.
//const CustomPermissions = z.record(
//  ConfigurableActionEnum,
//  ConfiguredPermissionLevelEnum,
//);
const CustomPermissions = z.object({
  inviteUsers: ConfiguredPermissionLevelEnum, // Invite users one at a time
  bulkInviteUsers: ConfiguredPermissionLevelEnum, // Invite users in batch
  manageOperators: ConfiguredPermissionLevelEnum, // Promote or demote operators
  manageInvitationLink: ConfiguredPermissionLevelEnum, // Create, roll, or deactivate invitation link
  editPuzzles: ConfiguredPermissionLevelEnum, // Add or edit puzzles
  deletePuzzles: ConfiguredPermissionLevelEnum, // Destroy or undestroy puzzles
  operateGuessQueue: ConfiguredPermissionLevelEnum, // Update guess states after submission when guess queue is enabled
  sendAnnouncements: ConfiguredPermissionLevelEnum,
  purgeHunt: ConfiguredPermissionLevelEnum, // Purge all contents of hunt
});
export type CustomPermissionsType = z.infer<typeof CustomPermissions>;

const EditableHunt = z.object({
  name: nonEmptyString,
  // Everyone that joins the hunt will be added to these mailing lists
  mailingLists: nonEmptyString.array().default([]),
  // This message is displayed (as markdown) to users that are not members of
  // this hunt. It should include instructions on how to join
  signupMessage: nonEmptyString.optional(),
  // If this is true, an operator must mark guesses as correct or not.
  // If this is false, users enter answers directly without the guess step, and
  // the operateGuessQueue permission is ignored.
  hasGuessQueue: z.boolean(),
  // If provided, users will be presented with this text as a modal to agree to
  // before accessing the hunt.
  termsOfUse: nonEmptyString.optional(),
  // If provided, then the specified permissions indicate the minimum role
  // required for a user to perform the specified action.
  customPermissions: CustomPermissions.optional(),
  // If this is provided, then this is used to generate links to puzzles' guess
  // submission pages. The format is interpreted as a Mustache template
  // (https://mustache.github.io/). It's passed as context a parsed URL
  // (https://nodejs.org/api/url.html#url_class_url), which provides variables
  // like "host" and "pathname".
  submitTemplate: nonEmptyString.optional(),
  // If provided, then this is a link to the overall root hunt homepage and will
  // be shown in the PuzzleListPage navbar.
  homepageUrl: nonEmptyString.url().optional(),
  // If provided, then announcements will be synced to this Discord channel
  announcementDiscordChannel: SavedDiscordObjectFields.optional(),
  // If provided, this is an object containing a Discord channel id and cached
  // channel name (for local presentation) to which we should post puzzle
  // create/solve messages as the server-configured Discord bot.
  puzzleHooksDiscordChannel: SavedDiscordObjectFields.optional(),
  // If provided, then any message sent in chat for a puzzle associated with
  // this hunt will be mirrored to the specified Discord channel.
  firehoseDiscordChannel: SavedDiscordObjectFields.optional(),
  // If provided, then members of the hunt who have also linked their Discord
  // profile will be added to this role.
  memberDiscordRole: SavedDiscordObjectFields.optional(),
});
export type EditableHuntType = z.infer<typeof EditableHunt>;
const Hunt = withCommon(EditableHunt);

const SavedDiscordObjectPattern = {
  id: String,
  name: String,
};

const ConfiguredPermissionPattern = Match.OneOf(
  "hunt_owner",
  "operator",
  "member",
);

export const HuntPattern = {
  name: String,
  mailingLists: [String] as [StringConstructor],
  signupMessage: Match.Optional(String),
  hasGuessQueue: Boolean,
  termsOfUse: Match.Optional(String),
  customPermissions: Match.Optional({
    inviteUsers: ConfiguredPermissionPattern,
    bulkInviteUsers: ConfiguredPermissionPattern,
    manageOperators: ConfiguredPermissionPattern,
    manageInvitationLink: ConfiguredPermissionPattern,
    editPuzzles: ConfiguredPermissionPattern,
    deletePuzzles: ConfiguredPermissionPattern,
    operateGuessQueue: ConfiguredPermissionPattern,
    sendAnnouncements: ConfiguredPermissionPattern,
    purgeHunt: ConfiguredPermissionPattern,
  }),
  submitTemplate: Match.Optional(String),
  homepageUrl: Match.Optional(String),
  announcementDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  puzzleHooksDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  firehoseDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  memberDiscordRole: Match.Optional(SavedDiscordObjectPattern),
};

const Hunts = new SoftDeletedModel("jr_hunts", Hunt);
export type HuntType = ModelType<typeof Hunts>;

export default Hunts;
