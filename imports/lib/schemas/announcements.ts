import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const AnnouncementFields = t.type({
  hunt: t.string,
  message: t.string,
});

const AnnouncementFieldsOverrides: Overrides<t.TypeOf<typeof AnnouncementFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [AnnouncementType, AnnouncementOverrides] = inheritSchema(
  BaseType, AnnouncementFields,
  BaseOverrides, AnnouncementFieldsOverrides,
);
export { AnnouncementType };

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
const Announcements = buildSchema(AnnouncementType, AnnouncementOverrides);

export default Announcements;
