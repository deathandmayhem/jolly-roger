import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from '../regexes';
import type { Overrides } from '../typedSchemas';
import { buildSchema } from '../typedSchemas';

// Don't use the BaseCodec here - unlike most database objects, this isn't
// manipulated by users, so many of the fields don't make sense
const CallHistoryCodec = t.type({
  _id: t.string,
  hunt: t.string,
  call: t.string,
  lastActivity: t.union([date, t.undefined]),
});

const CallHistoryOverrides: Overrides<t.TypeOf<typeof CallHistoryCodec>> = {
  hunt: {
    regEx: Id,
  },
  call: {
    regEx: Id,
  },
};

export { CallHistoryCodec };
export type CallHistoryType = t.TypeOf<typeof CallHistoryCodec>;

export default buildSchema(CallHistoryCodec, CallHistoryOverrides);
