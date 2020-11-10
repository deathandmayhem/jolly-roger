import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

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
  // If this is provided, then this is used to generate links to puzzles' guess
  // submission pages. The format is interpreted as a Mustache template
  // (https://mustache.github.io/). It's passed as context a parsed URL
  // (https://nodejs.org/api/url.html#url_class_url), which provides variables
  // like "host" and "pathname".
  submitTemplate: t.union([t.string, t.undefined]),
});

const HuntFieldsOverrides: Overrides<t.TypeOf<typeof HuntFields>> = {
  mailingLists: {
    defaultValue: [],
  },
  openSignups: {
    defaultValue: false,
  },
};

const [HuntCodec, HuntOverrides] = inheritSchema(
  BaseCodec, HuntFields,
  BaseOverrides, HuntFieldsOverrides,
);
export { HuntCodec };
export type HuntType = t.TypeOf<typeof HuntCodec>;

const Hunts = buildSchema(HuntCodec, HuntOverrides);

export default Hunts;
