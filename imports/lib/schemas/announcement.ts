import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const AnnouncementFields = t.type({
  hunt: t.string,
  message: t.string,
});

const AnnouncementFieldsOverrides: Overrides<t.TypeOf<typeof AnnouncementFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [AnnouncementCodec, AnnouncementOverrides] = inheritSchema(
  BaseCodec,
  AnnouncementFields,
  BaseOverrides,
  AnnouncementFieldsOverrides,
);
export { AnnouncementCodec };
export type AnnouncementType = t.TypeOf<typeof AnnouncementCodec>;

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
const Announcement = buildSchema(AnnouncementCodec, AnnouncementOverrides);

export default Announcement;
