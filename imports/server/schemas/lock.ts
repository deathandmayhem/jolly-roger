import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const LockType = t.type({
  name: t.string,
  createdAt: date,
});

const LockOverrides: Overrides<t.TypeOf<typeof LockType>> = {
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
};

const Lock = buildSchema(LockType, LockOverrides);

export default Lock;
