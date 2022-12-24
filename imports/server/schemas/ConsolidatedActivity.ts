import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from '../../lib/schemas/regexes';
import { buildSchema, Overrides } from '../../lib/schemas/typedSchemas';

const ConsolidatedActivityCodec = t.type({
  _id: t.string,
  ts: date,
  hunt: t.string,
  puzzle: t.string,
  total: t.Int,
  components: t.type({
    chat: t.Int,
    call: t.Int,
  }),
});

export type ConsolidatedActivityType = t.OutputOf<typeof ConsolidatedActivityCodec>;

const ConsolidatedActivityOverrides: Overrides<t.TypeOf<typeof ConsolidatedActivityCodec>> = {
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
};

export default buildSchema(ConsolidatedActivityCodec, ConsolidatedActivityOverrides);
