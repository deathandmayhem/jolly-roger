import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from '../../lib/schemas/typedSchemas';
import { BaseType, BaseOverrides } from '../../lib/schemas/base';

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

const [APIKeyType, APIKeyOverrides] = inheritSchema(
  BaseType, APIKeyFields,
  BaseOverrides, APIKeyFieldsOverrides,
);
export { APIKeyType };

const APIKeys = buildSchema(APIKeyType, APIKeyOverrides);

export default APIKeys;
