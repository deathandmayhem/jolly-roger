import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema } from './typedSchemas';

const UserCodec = t.type({
  username: t.union([t.string, t.undefined]),
  emails: t.array(t.type({
    address: t.string,
    verified: t.boolean,
  })),
  createdAt: date,
  lastLogin: t.union([date, t.undefined]),
  services: t.union([t.object, t.undefined]),
  roles: t.union([t.array(t.string), t.undefined]),
  hunts: t.array(t.string),
  profile: t.type({
    operating: t.boolean,
  }),
});

const UserOverrides: Overrides<t.TypeOf<typeof UserCodec>> = {
  username: {
    regEx: /^[a-z0-9A-Z_]{3,15}$/,
  },
  emails: {
    array: {
      nested: {
        address: {
          regEx: SimpleSchema.RegEx.Email,
        },
      },
    },
  },
  hunts: {
    defaultValue: [],
    array: {
      regEx: SimpleSchema.RegEx.Id,
    },
  },
  profile: {
    defaultValue: {},
    nested: {
      operating: {
        defaultValue: false,
      },
    },
  },
};

// Does not inherit from Base
const User = buildSchema(UserCodec, UserOverrides);

export default User;
