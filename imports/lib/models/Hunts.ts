import { Match } from "meteor/check";
import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { nonEmptyString, snowflake } from "./customTypes";
import withCommon from "./withCommon";

export const SavedDiscordObjectFields = z.object({
  id: snowflake,
  name: nonEmptyString,
});

export type SavedDiscordObjectType = z.infer<typeof SavedDiscordObjectFields>;

const EditableHunt = z.object({
  name: nonEmptyString,
  // Everyone that joins the hunt will be added to these mailing lists
  mailingLists: nonEmptyString.array().default([]),
  // This message is displayed (as markdown) to users that are not members of
  // this hunt. It should include instructions on how to join
  signupMessage: nonEmptyString.optional(),
  // If this is true, then any member of this hunt is allowed to add others to
  // it. Otherwise, you must be an operator to add someone to the hunt.
  openSignups: z.boolean().default(false),
  // If this is true, an operator must mark guesses as correct or not.
  // If this is false, users enter answers directly without the guess step.
  hasGuessQueue: z.boolean(),
  // If provided, users will be presented with this text as a modal to agree to
  // before accessing the hunt.
  termsOfUse: nonEmptyString.optional(),
  // If this is provided, then this is used to generate links to puzzles' guess
  // submission pages. The format is interpreted as a Mustache template
  // (https://mustache.github.io/). It's passed as context a parsed URL
  // (https://nodejs.org/api/url.html#url_class_url), which provides variables
  // like "host" and "pathname".
  submitTemplate: nonEmptyString.optional(),
  // If provided, then this is a link to the overall root hunt homepage and will
  // be shown in the PuzzleListPage navbar.
  homepageUrl: nonEmptyString.url().optional(),
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
  // If provided, this is an invitation code that can be used to join this hunt.
  // This takes the place of a direct (user-to-user) invitation.
  invitationCode: nonEmptyString.optional(),
});
export type EditableHuntType = z.infer<typeof EditableHunt>;
const Hunt = withCommon(EditableHunt);

const SavedDiscordObjectPattern = {
  id: String,
  name: String,
};

export const HuntPattern = {
  name: String,
  mailingLists: [String] as [StringConstructor],
  signupMessage: Match.Optional(String),
  openSignups: Boolean,
  hasGuessQueue: Boolean,
  termsOfUse: Match.Optional(String),
  submitTemplate: Match.Optional(String),
  homepageUrl: Match.Optional(String),
  puzzleHooksDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  firehoseDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  memberDiscordRole: Match.Optional(SavedDiscordObjectPattern),
  invitationCode: Match.Optional(String),
};

const Hunts = new SoftDeletedModel("jr_hunts", Hunt);
export type HuntType = ModelType<typeof Hunts>;

export default Hunts;
