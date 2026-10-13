import { z } from "zod";
import { nonEmptyString, snowflake } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import { Url } from "../typedModel/regexes";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

export const SavedDiscordObjectFields = z.strictObject({
  id: snowflake,
  name: nonEmptyString,
});

export type SavedDiscordObjectType = z.infer<typeof SavedDiscordObjectFields>;

const BaseHunt = z.strictObject({
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
  homepageUrl: z.string().regex(Url).optional(),
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
// Fields with document-construction defaults stay required for RPC callers;
// otherwise they would get re-set to their defaults when the update RPC parses
// the input.
export const EditableHunt = BaseHunt.required({
  mailingLists: true,
  openSignups: true,
});
export type EditableHuntType = z.infer<typeof EditableHunt>;
const Hunt = withCommon(BaseHunt);

const Hunts = new SoftDeletedModel("jr_hunts", Hunt);
export type HuntType = ModelType<typeof Hunts>;

export default Hunts;
