import * as t from 'io-ts';
import { date } from 'io-ts-types';
import DiscordAccount from './DiscordAccount';
import { Email, Id } from './regexes';
import { Overrides, buildSchema } from './typedSchemas';

declare module 'meteor/meteor' {
  namespace Meteor {
    interface User {
      lastLogin?: Date;
      hunts?: string[];
      roles?: Record<string, string[]>; // scope -> roles
      displayName?: string;
      googleAccount?: string;
      discordAccount?: t.TypeOf<typeof DiscordAccount>;
      phoneNumber?: string;
      dingwords?: string[];
    }
  }
}

export const UserCodec = t.type({
  username: t.union([t.string, t.undefined]),
  emails: t.array(t.type({
    address: t.string,
    verified: t.boolean,
  })),
  createdAt: date,
  lastLogin: t.union([date, t.undefined]),
  services: t.union([t.UnknownRecord, t.undefined]),
  roles: t.union([t.UnknownRecord, t.undefined]),
  hunts: t.union([t.array(t.string), t.undefined]),
  displayName: t.union([t.undefined, t.string]),
  googleAccount: t.union([t.string, t.undefined]),
  discordAccount: t.union([DiscordAccount, t.undefined]),
  phoneNumber: t.union([t.string, t.undefined]),
  dingwords: t.union([t.array(t.string), t.undefined]),
});

export type ProfileFields = 'displayName' | 'googleAccount' | 'discordAccount' | 'phoneNumber' | 'dingwords';

const UserOverrides: Overrides<t.TypeOf<typeof UserCodec>> = {
  username: {
    regEx: /^[a-z0-9A-Z_]{3,15}$/,
  },
  emails: {
    array: {
      nested: {
        address: {
          regEx: Email,
        },
      },
    },
  },
  hunts: {
    defaultValue: [],
    array: {
      regEx: Id,
    },
  },
};

// Does not inherit from Base
const User = buildSchema(UserCodec, UserOverrides);

export default User;
