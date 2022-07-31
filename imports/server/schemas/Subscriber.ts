import * as t from 'io-ts';
import { date } from 'io-ts-types';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const SubscriberCodec = t.type({
  server: t.string,
  connection: t.string,
  user: t.string,
  name: t.string,
  context: t.UnknownRecord,
  createdAt: date,
  updatedAt: t.union([date, t.undefined]),
});
export type SubscriberType = t.TypeOf<typeof SubscriberCodec>;

const SubscriberOverrides: Overrides<SubscriberType> = {
  server: {
    regEx: SimpleSchema.RegEx.Id,
  },
  connection: {
    regEx: SimpleSchema.RegEx.Id,
  },
  user: {
    regEx: SimpleSchema.RegEx.Id,
  },
  createdAt: {
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        this.unset(); // Prevent user from supplying their own value
      }
      return undefined;
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
};

const Subscriber = buildSchema(SubscriberCodec, SubscriberOverrides);

export default Subscriber;
