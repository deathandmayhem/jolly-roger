import type zodToMongoSchema from "zod-to-mongo-schema";

type MongoSchema = ReturnType<typeof zodToMongoSchema>;

const compositionKeywords = ["allOf", "anyOf", "oneOf"] as const;

// Collect the property names declared by a schema, recursing into composition
// keywords (e.g. a discriminated union declares the properties of all of its
// variants).
function collectPropertyNames(schema: MongoSchema, names: Set<string>) {
  for (const name of Object.keys(schema.properties ?? {})) {
    names.add(name);
  }
  for (const keyword of compositionKeywords) {
    for (const variant of schema[keyword] ?? []) {
      collectPropertyNames(variant, names);
    }
  }
}

// Add {} placeholders for missing sibling property names to any subschema that
// declares additionalProperties: false, recursing into composition keywords.
function addSiblingPropertyPlaceholders(
  schema: MongoSchema,
  allNames: Set<string>,
) {
  if (schema.additionalProperties === false) {
    const properties = (schema.properties ??= {});
    for (const name of allNames) {
      properties[name] ??= {};
    }
  }
  for (const keyword of compositionKeywords) {
    for (const variant of schema[keyword] ?? []) {
      addSiblingPropertyPlaceholders(variant, allNames);
    }
  }
}

// In JSON Schema, additionalProperties only considers properties declared in
// the same schema object, not in sibling allOf entries. Zod's toJSONSchema
// emits additionalProperties: false on each entry of an intersection's allOf,
// which makes the combined schema unsatisfiable: each entry rejects the
// properties declared by its siblings. This bites any model whose schema is an
// intersection rather than a plain object (Documents and Settings, which are
// built on discriminated unions).
//
// Until https://github.com/colinhacks/zod/pull/5702 is merged and released, we
// post-process the generated schema with the same strategy that fix uses for
// pre-2020-12 drafts (which includes MongoDB's dialect): add {} placeholders
// for sibling property names to each strict allOf entry. Once the fix ships in
// Zod, we can delete this file.
export default function fixAllOfAdditionalProperties(schema: MongoSchema) {
  if (schema.allOf) {
    const names = new Set<string>();
    for (const entry of schema.allOf) {
      collectPropertyNames(entry, names);
    }
    for (const entry of schema.allOf) {
      addSiblingPropertyPlaceholders(entry, names);
    }
  }

  // Recurse into any nested subschemas
  for (const keyword of compositionKeywords) {
    for (const variant of schema[keyword] ?? []) {
      fixAllOfAdditionalProperties(variant);
    }
  }
  for (const value of Object.values(schema.properties ?? {})) {
    fixAllOfAdditionalProperties(value);
  }
  for (const value of Object.values(schema.patternProperties ?? {})) {
    fixAllOfAdditionalProperties(value);
  }
  for (const value of Object.values(schema.dependencies ?? {})) {
    if (!Array.isArray(value)) {
      fixAllOfAdditionalProperties(value);
    }
  }
  if (Array.isArray(schema.items)) {
    for (const item of schema.items) {
      fixAllOfAdditionalProperties(item);
    }
  } else if (schema.items) {
    fixAllOfAdditionalProperties(schema.items);
  }
  if (typeof schema.additionalItems === "object") {
    fixAllOfAdditionalProperties(schema.additionalItems);
  }
  if (typeof schema.additionalProperties === "object") {
    fixAllOfAdditionalProperties(schema.additionalProperties);
  }
  if (schema.not) {
    fixAllOfAdditionalProperties(schema.not);
  }
}
