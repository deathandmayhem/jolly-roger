import {
  type $ZodType,
  type $ZodTypes,
  globalRegistry,
  safeParse,
} from "zod/v4/core";
import zodToMongoSchema from "zod-to-mongo-schema";
import { allowedEmptyString } from "./customTypes";

function validateSchemaInner(raw: $ZodType) {
  // This is the documented way to traverse a schema
  const schema = raw as unknown as $ZodTypes;
  const { def } = schema._zod;

  switch (def.type) {
    case "string": {
      // String fields must not accept empty strings, unless they're
      // specifically allowedEmptyString
      if (schema === allowedEmptyString) break;

      const result = safeParse(schema, "");
      if (result.success) {
        throw new Error(`String fields must not accept empty strings`);
      }
      break;
    }

    // Recurse on composite types

    case "intersection":
      validateSchemaInner(def.left);
      validateSchemaInner(def.right);
      break;

    case "union":
      def.options.forEach((option) => validateSchemaInner(option));
      break;

    case "default":
    case "prefault":
    case "nullable":
    case "optional":
    case "nonoptional":
    case "readonly":
      validateSchemaInner(def.innerType);
      break;

    case "array":
      validateSchemaInner(def.element);
      break;

    case "object":
      for (const [, field] of Object.entries(def.shape)) {
        if (field === undefined) continue;
        validateSchemaInner(field);
      }
      if (def.catchall) {
        validateSchemaInner(def.catchall);
      }
      break;

    case "record":
      validateSchemaInner(def.valueType);
      break;

    case "tuple":
      def.items.forEach((item) => validateSchemaInner(item));
      break;

    // Leaf types with no additional rules to check. (any and unknown are
    // deliberate accept-anything schemas, unlike the unrecognized types
    // rejected below, which merely serialize to accept-anything.)
    case "number":
    case "boolean":
    case "date":
    case "enum":
    case "literal":
    case "any":
    case "unknown":
      break;

    case "custom":
      // We can't introspect custom schemas (z.instanceof and friends), so we
      // only accept them when they declare an explicit bsonType for MongoDB
      // to enforce (like uint8Array does); otherwise they'd serialize to an
      // empty schema that validates nothing.
      if (!globalRegistry.get(schema)?.bsonType) {
        throw new Error(
          `Custom schema types must declare a bsonType via .meta()`,
        );
      }
      break;

    default:
      // Anything we don't recognize (transforms, pipes, maps, ...) would
      // serialize to an empty JSON Schema that validates nothing, so we
      // reject it rather than silently dropping validation for the field.
      throw new Error(`Unknown schema type: ${def.type}`);
  }
}

// Verify that a provided schema is compatible with our rules:
//
// - It must be compatible with MongoDB (via zod-to-mongo-schema)
// - All string fields must have a length constraint (or explicitly use
//   allowedEmptyString to capture intent)
// - It must only use schema types we know produce meaningful validation.
//   In particular, transforms and pipes are not supported, and custom types
//   (z.instanceof) must declare a bsonType via .meta()
export default function validateSchema(schema: $ZodType) {
  try {
    zodToMongoSchema(schema, { strict: false });
  } catch (error: unknown) {
    throw new Error(`Schema is not compatible with MongoDB: ${error}`, {
      cause: error,
    });
  }

  validateSchemaInner(schema);
}
