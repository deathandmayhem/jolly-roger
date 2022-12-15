import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from './regexes';
import { Overrides, buildSchema } from './typedSchemas';

/* DocumentActivityFields doesn't inherit from Base because it's created by the
   server, not by users */
export const DocumentActivityCodec = t.type({
  _id: t.string,
  ts: date, /* 5 minute granularity */
  hunt: t.string,
  puzzle: t.string,
  document: t.string,
});
export type DocumentActivityType = t.TypeOf<typeof DocumentActivityCodec>;

const DocumentActivityOverrides: Overrides<t.TypeOf<typeof DocumentActivityCodec>> = {
  _id: {
    regEx: Id,
    denyUpdate: true,
  },
  ts: {
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
  document: {
    regEx: Id,
    denyUpdate: true,
  },
};

const DocumentActivity = buildSchema(DocumentActivityCodec, DocumentActivityOverrides);

export default DocumentActivity;
