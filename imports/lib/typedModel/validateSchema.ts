import { type $ZodType, type $ZodTypes, safeParse } from "zod/v4/core";
import zodToMongoSchema from "zod-to-mongo-schema";
import { allowedEmptyString } from "./customTypes";

function validateSchemaInner<Schema extends $ZodType>(raw: Schema) {
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
      break;

    case "record":
    case "map":
    case "set":
      validateSchemaInner(def.valueType);
      break;

    case "tuple":
      def.items.forEach((item) => validateSchemaInner(item));
      break;

    default:
      // No validation needed
      break;
  }
}

// Verify that a provided schema is compatible with our rules:
//
// - It must be compatible with MongoDB (via zod-to-mongo-schema)
// - All string fields must have a length constraint (or explicitly use
//   allowedEmptyString to capture intent)
export default function validateSchema<Schema extends $ZodType>(
  schema: Schema,
) {
  try {
    zodToMongoSchema(schema, { strict: false });
  } catch (error: unknown) {
    throw new Error(`Schema is not compatible with MongoDB: ${error}`, {
      cause: error,
    });
  }

  validateSchemaInner(schema);
}
