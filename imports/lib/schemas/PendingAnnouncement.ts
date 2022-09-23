import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const PendingAnnouncementFields = t.type({
  hunt: t.string,
  announcement: t.string,
  user: t.string,
});

const PendingAnnouncementFieldsOverrides: Overrides<t.TypeOf<typeof PendingAnnouncementFields>> = {
  hunt: {
    regEx: Id,
  },
  announcement: {
    regEx: Id,
  },
  user: {
    regEx: Id,
  },
};

const [PendingAnnouncementCodec, PendingAnnouncementOverrides] = inheritSchema(
  BaseCodec,
  PendingAnnouncementFields,
  BaseOverrides,
  PendingAnnouncementFieldsOverrides,
);
export { PendingAnnouncementCodec };
export type PendingAnnouncementType = t.TypeOf<typeof PendingAnnouncementCodec>;

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncement = buildSchema(PendingAnnouncementCodec, PendingAnnouncementOverrides);

export default PendingAnnouncement;
