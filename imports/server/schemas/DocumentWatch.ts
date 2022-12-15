import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Id } from '../../lib/schemas/regexes';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const DocumentWatchCodec = t.type({
  _id: t.string,
  document: t.string,
  watchId: t.string,
  watchResourceId: t.string,
  watchExpiration: date,
});

export type DocumentWatchType = t.TypeOf<typeof DocumentWatchCodec>;

const DocumentWatchOverrides: Overrides<DocumentWatchType> = {
  _id: {
    regEx: Id,
    denyUpdate: true,
  },
  document: {
    regEx: Id,
    denyUpdate: true,
  },
  watchId: {
    regEx: Id,
  },
};

const DocumentWatch = buildSchema(DocumentWatchCodec, DocumentWatchOverrides);

export default DocumentWatch;
