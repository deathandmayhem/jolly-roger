import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

const SubscriberType = t.type({
  server: t.string,
  connection: t.string,
  user: t.string,
  name: t.string,
  context: t.object,
  createdAt: date,
  updatedAt: t.union([date, t.undefined]),
});

const SubscriberOverrides: Overrides<t.TypeOf<typeof SubscriberType>> = {
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

const Subscribers = buildSchema(SubscriberType, SubscriberOverrides);

export default Subscribers;
