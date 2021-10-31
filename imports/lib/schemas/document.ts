import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, inheritSchema, buildSchema } from './typedSchemas';

// We can't represent tagged unions (or possible future tagged unions) in
// SimpleSchema, so we use different types for the actual type vs. the type used
// to derive the schema.
export const DocumentCodec = t.intersection([
  BaseCodec,
  t.type({
    hunt: t.string,
    puzzle: t.string,
  }),
  // If we add other providers in the future, turn this into a tagged union on
  // provider
  t.type({
    provider: t.literal('google'),
    value: t.type({
      type: t.union([t.literal('spreadsheet'), t.literal('document')]),
      id: t.string,
    }),
  }),
]);
export type DocumentType = t.TypeOf<typeof DocumentCodec>;

const DocumentFields = t.type({
  hunt: t.string,
  puzzle: t.string,
  provider: t.string,
  // This is opaque to the specific provider.
  //
  // For provider=google, this consists of a "type" ("spreadsheet" or
  // "document") and an id
  value: t.object,
});

const DocumentFieldsOverrides: Overrides<t.TypeOf<typeof DocumentFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  puzzle: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [DocumentSchemaCodec, DocumentOverrides] = inheritSchema(
  BaseCodec, DocumentFields,
  BaseOverrides, DocumentFieldsOverrides,
);

// Not named Document because Document is an interface reserved by the Web Platform
const DocumentSchema = buildSchema(DocumentSchemaCodec, DocumentOverrides);

export default DocumentSchema;
