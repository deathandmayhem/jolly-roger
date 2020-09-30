import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const LockCodec = t.type({
  _id: t.string,
  name: t.string,
  createdAt: date,
});
export type LockType = t.TypeOf<typeof LockCodec>;

const LockOverrides: Overrides<LockType> = {
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

const Lock = buildSchema(LockCodec, LockOverrides);

export default Lock;
