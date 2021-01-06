import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { buildSchema, Overrides } from './typedSchemas';

// Don't use the BaseCodec here - unlike most database objects, this isn't
// manipulated by users, so many of the fields don't make sense
export const DiscordCacheCodec = t.type({
  _id: t.string,
  createdAt: date,
  updatedAt: t.union([date, t.undefined]),
  snowflake: t.string,
  type: t.string,
  object: t.object,
});

const DiscordCacheOverrides: Overrides<t.TypeOf<typeof DiscordCacheCodec>> = {
  createdAt: {
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        this.unset(); // Prevent user from supplying their own value
        return undefined;
      }
    },
  },

  updatedAt: {
    denyInsert: true,
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      }
      return undefined;
    },
  },

  snowflake: {
    regEx: /[0-9]+/,
  },
};

export type DiscordCacheType = t.TypeOf<typeof DiscordCacheCodec>;

const DiscordCache = buildSchema(DiscordCacheCodec, DiscordCacheOverrides);

export default DiscordCache;
