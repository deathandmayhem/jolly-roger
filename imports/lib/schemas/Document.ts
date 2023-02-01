/* eslint-disable filenames/match-exported */
import { z } from 'zod';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const DocumentSchema = withCommon(z.object({
  hunt: foreignKey,
  puzzle: foreignKey,
}).and(z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('google'),
    value: z.object({
      type: z.enum(['spreadsheet', 'document']),
      id: nonEmptyString,
      folder: nonEmptyString.optional(),
    }),
  }),
])));

export default DocumentSchema;
