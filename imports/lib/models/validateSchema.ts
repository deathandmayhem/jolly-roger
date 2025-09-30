import type { z } from "zod";
import { allowedEmptyString } from "./customTypes";

export default function validateSchema<T extends z.ZodType>(
  schema: T,
  path: string[] = [],
) {
  const { def } = schema._zod;

  switch (def.type) {
    case "object":
      Object.entries((def as z.ZodObject).shape).forEach(([key, field]) =>
        validateSchema(field as z.ZodTypeAny, [...path, key]),
      );
      validateSchema((def as z.ZodObject).catchall, path);
      break;
    case "array":
      validateSchema(def.element, [...path, "[]"]);
      break;
    case "union":
      (def as z.ZodUnion).options.forEach((option: z.ZodType) =>
        validateSchema(option, path),
      );
      break;
    case "intersection":
      validateSchema(def.left, path);
      validateSchema(def.right, path);
      break;
    case "tuple":
      (def as z.ZodTuple).items.forEach((item: z.ZodType, idx: number) => {
        return validateSchema(item, [...path, idx.toString()]);
      });
      break;
    case "record":
      validateSchema(def.valueType, [...path, "[]"]);
      break;

    case "default":
    case "nullable":
    case "optional":
      validateSchema(def.innerType, path);
      break;

    case "enum":
    case "literal":
    case "number":
    case "date":
    case "boolean":
    case "never":
    case "any":
    case "unknown":
      // No validation needed
      break;

    case "string": {
      // String fields must not accept empty strings, unless they're
      // specifically allowedEmptyString
      if ((schema as z.ZodString) === allowedEmptyString) break;

      const result = schema.safeParse("");
      if (result.success) {
        throw new Error(
          `String fields must not accept empty strings (${path.join(".")})`,
        );
      }
      break;
    }

    default:
      throw new Error(`Unknown schema type: ${def.type}`);
  }
}
