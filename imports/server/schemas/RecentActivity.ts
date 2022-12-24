import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from '../../lib/schemas/regexes';
import { buildSchema, Overrides } from '../../lib/schemas/typedSchemas';

// Not descended from Base as this is managed by the server
const RecentActivityCodec = t.type({
  _id: t.string,
  ts: date,
  type: t.union([t.literal('chat'), t.literal('call')]),
  hunt: t.string,
  puzzle: t.string,
  user: t.string,
});

export type RecentActivityType = t.TypeOf<typeof RecentActivityCodec>;

const RecentActivityOverrides: Overrides<RecentActivityType> = {
  _id: {
    regEx: Id,
    denyUpdate: true,
  },
  hunt: {
    regEx: Id,
    denyUpdate: true,
  },
  puzzle: {
    regEx: Id,
    denyUpdate: true,
  },
  user: {
    regEx: Id,
    denyUpdate: true,
  },
};

export default buildSchema(RecentActivityCodec, RecentActivityOverrides);
