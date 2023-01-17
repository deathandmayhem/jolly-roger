import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../../lib/schemas/Base';
import { Id } from '../../lib/schemas/regexes';
import type { Overrides } from '../../lib/schemas/typedSchemas';
import { buildSchema, inheritSchema } from '../../lib/schemas/typedSchemas';

const APIKeyFields = t.type({
  user: t.string,
  key: t.string,
});

const APIKeyFieldsOverrides: Overrides<t.TypeOf<typeof APIKeyFields>> = {
  user: {
    regEx: Id,
  },
  key: {
    regEx: /^[A-Za-z0-9]{32}$/,
  },
};

const [APIKeyCodec, APIKeyOverrides] = inheritSchema(
  BaseCodec,
  APIKeyFields,
  BaseOverrides,
  APIKeyFieldsOverrides,
);
export { APIKeyCodec };
export type APIKeyType = t.TypeOf<typeof APIKeyCodec>;

const APIKey = buildSchema(APIKeyCodec, APIKeyOverrides);

export default APIKey;
