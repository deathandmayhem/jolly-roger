import * as t from 'io-ts';
import { date } from 'io-ts-types';
import SimpleSchema from 'simpl-schema';
import { buildSchema, Overrides } from './typedSchemas';

export const BaseCodec = t.type({
  // Note: _id is part of the type, but does not get copied into the schema
  // because it creates weird behavior (c.f. aldeed/meteor-collection2#124)
  _id: t.string,
  deleted: t.boolean,
  createdAt: date,
  createdBy: t.string,
  updatedAt: t.union([date, t.undefined]),
  updatedBy: t.union([t.string, t.undefined]),
});

export type BaseType = t.TypeOf<typeof BaseCodec>;

export const BaseOverrides: Overrides<BaseType> = {
  deleted: {
    autoValue() {
      if (this.isSet) {
        return undefined;
      }

      if (this.isInsert) {
        return false;
      } else if (this.isUpsert) {
        return { $setOnInsert: false };
      }
      return undefined;
    },
  },
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
  createdBy: {
    regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      if (this.isInsert) {
        return this.userId;
      } else if (this.isUpsert) {
        return { $setOnInsert: this.userId };
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
  updatedBy: {
    regEx: SimpleSchema.RegEx.Id,
    denyInsert: true,
    autoValue() {
      if (this.isUpdate) {
        return this.userId;
      }
      return undefined;
    },
  },
};

export default buildSchema(BaseCodec, BaseOverrides);
