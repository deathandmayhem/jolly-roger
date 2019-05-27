import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from '../../lib/schemas/typedSchemas';
import { BaseCodec, BaseOverrides } from '../../lib/schemas/base';

const APIKeyFields = t.type({
  user: t.string,
  key: t.string,
});

const APIKeyFieldsOverrides: Overrides<t.TypeOf<typeof APIKeyFields>> = {
  user: {
    regEx: SimpleSchema.RegEx.Id,
  },
  key: {
    regEx: /^[A-Za-z0-9]{32}$/,
  },
};

const [APIKeyCodec, APIKeyOverrides] = inheritSchema(
  BaseCodec, APIKeyFields,
  BaseOverrides, APIKeyFieldsOverrides,
);
export { APIKeyCodec };
export type APIKeyType = t.TypeOf<typeof APIKeyCodec>;

const APIKeys = buildSchema(APIKeyCodec, APIKeyOverrides);

export default APIKeys;
