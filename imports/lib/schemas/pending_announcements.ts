import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const PendingAnnouncementFields = t.type({
  hunt: t.string,
  announcement: t.string,
  user: t.string,
});

const PendingAnnouncementFieldsOverrides: Overrides<t.TypeOf<typeof PendingAnnouncementFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  announcement: {
    regEx: SimpleSchema.RegEx.Id,
  },
  user: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [PendingAnnouncementType, PendingAnnouncementOverrides] = inheritSchema(
  BaseType, PendingAnnouncementFields,
  BaseOverrides, PendingAnnouncementFieldsOverrides,
);
export { PendingAnnouncementType };

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncements = buildSchema(PendingAnnouncementType, PendingAnnouncementOverrides);

export default PendingAnnouncements;
