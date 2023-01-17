import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from '../../lib/schemas/regexes';
import type { Overrides } from '../../lib/schemas/typedSchemas';
import { buildSchema } from '../../lib/schemas/typedSchemas';

// Not descended from Base as this is managed by the server
const CallActivityCodec = t.type({
  _id: t.string,
  ts: date,
  hunt: t.string,
  call: t.string,
  user: t.string,
});

export type CallActivityType = t.TypeOf<typeof CallActivityCodec>;

const CallActivityOverrides: Overrides<CallActivityType> = {
  _id: {
    regEx: Id,
    denyUpdate: true,
  },
  hunt: {
    regEx: Id,
    denyUpdate: true,
  },
  call: {
    regEx: Id,
    denyUpdate: true,
  },
  user: {
    regEx: Id,
    denyUpdate: true,
  },
};

export default buildSchema(CallActivityCodec, CallActivityOverrides);
