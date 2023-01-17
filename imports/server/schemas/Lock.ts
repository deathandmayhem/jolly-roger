import * as t from 'io-ts';
import { date } from 'io-ts-types';
import type { Overrides } from '../../lib/schemas/typedSchemas';
import { buildSchema } from '../../lib/schemas/typedSchemas';

export const LockCodec = t.type({
  _id: t.string,
  name: t.string,
  createdAt: date,
  renewedAt: date,
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

  renewedAt: {
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      }
      return undefined;
    },
  },
};

const Lock = buildSchema(LockCodec, LockOverrides);

export default Lock;
