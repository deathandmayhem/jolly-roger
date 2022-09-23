import { Match } from 'meteor/check';
import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { ValidUrl } from './validators';

export const SavedDiscordObjectFields = t.type({
  id: t.string,
  name: t.string,
});

export type SavedDiscordObjectType = t.TypeOf<typeof SavedDiscordObjectFields>;

const HuntFields = t.type({
  name: t.string,
  // Everyone that joins the hunt will be added to these mailing lists
  mailingLists: t.array(t.string),
  // This message is displayed (as markdown) to users that are not members of
  // this hunt. It should include instructions on how to join
  signupMessage: t.union([t.string, t.undefined]),
  // If this is true, then any member of this hunt is allowed to add others to
  // it. Otherwise, you must be an operator to add someone to the hunt.
  openSignups: t.boolean,
  // If this is true, an operator must mark guesses as correct or not.
  // If this is false, users enter answers directly without the guess step.
  hasGuessQueue: t.boolean,
  // If this is provided, then this is used to generate links to puzzles' guess
  // submission pages. The format is interpreted as a Mustache template
  // (https://mustache.github.io/). It's passed as context a parsed URL
  // (https://nodejs.org/api/url.html#url_class_url), which provides variables
  // like "host" and "pathname".
  submitTemplate: t.union([t.string, t.undefined]),
  // If provided, then this is a link to the overall root hunt homepage and will
  // be shown in the PuzzleListPage navbar.
  homepageUrl: t.union([t.string, t.undefined]),
  // If provided, this is an object containing a Discord channel id and cached
  // channel name (for local presentation) to which we should post puzzle
  // create/solve messages as the server-configured Discord bot.
  puzzleHooksDiscordChannel: t.union([SavedDiscordObjectFields, t.undefined]),
  // If provided, then any message sent in chat for a puzzle associated with
  // this hunt will be mirrored to the specified Discord channel.
  firehoseDiscordChannel: t.union([SavedDiscordObjectFields, t.undefined]),
  // If provided, then members of the hunt who have also linked their Discord
  // profile will be added to this role.
  memberDiscordRole: t.union([SavedDiscordObjectFields, t.undefined]),
});

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
  submitTemplate: Match.Optional(String),
  homepageUrl: Match.Optional(String),
  puzzleHooksDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  firehoseDiscordChannel: Match.Optional(SavedDiscordObjectPattern),
  memberDiscordRole: Match.Optional(SavedDiscordObjectPattern),
};

const HuntFieldsOverrides: Overrides<t.TypeOf<typeof HuntFields>> = {
  mailingLists: {
    defaultValue: [],
  },
  openSignups: {
    defaultValue: false,
  },
  homepageUrl: {
    custom: ValidUrl,
  },
};

const [HuntCodec, HuntOverrides] = inheritSchema(
  BaseCodec,
  HuntFields,
  BaseOverrides,
  HuntFieldsOverrides,
);
export { HuntCodec };
export type HuntType = t.TypeOf<typeof HuntCodec>;

const Hunt = buildSchema(HuntCodec, HuntOverrides);

export default Hunt;
