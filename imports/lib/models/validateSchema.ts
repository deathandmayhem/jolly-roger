import { z } from "zod";

import { allowedEmptyString } from "./customTypes";

export default function validateSchema<T extends z.ZodFirstPartySchemaTypes>(
  schema: T,
  path: string[] = [],
) {
  const { _def: def } = schema;

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject:
      Object.entries(def.shape()).forEach(([key, field]) =>
        validateSchema(field as z.ZodTypeAny, [...path, key]),
      );
      validateSchema(def.catchall, path);
      break;
    case z.ZodFirstPartyTypeKind.ZodArray:
      validateSchema(def.type, [...path, "[]"]);
      break;
    case z.ZodFirstPartyTypeKind.ZodUnion:
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      def.options.forEach((option: z.ZodTypeAny) =>
        validateSchema(option, path),
      );
      break;
    case z.ZodFirstPartyTypeKind.ZodIntersection:
      validateSchema(def.left, path);
      validateSchema(def.right, path);
      break;
    case z.ZodFirstPartyTypeKind.ZodTuple:
      def.items.forEach((item: z.ZodTypeAny, idx: number) => {
        return validateSchema(item, [...path, idx.toString()]);
      });
      break;
    case z.ZodFirstPartyTypeKind.ZodRecord:
      validateSchema(def.valueType, [...path, "[]"]);
      break;

    case z.ZodFirstPartyTypeKind.ZodDefault:
    case z.ZodFirstPartyTypeKind.ZodNullable:
    case z.ZodFirstPartyTypeKind.ZodOptional:
      validateSchema(def.innerType, path);
      break;
    case z.ZodFirstPartyTypeKind.ZodEffects:
      validateSchema(def.schema, path);
      break;

    case z.ZodFirstPartyTypeKind.ZodEnum:
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
    case z.ZodFirstPartyTypeKind.ZodLiteral:
    case z.ZodFirstPartyTypeKind.ZodNumber:
    case z.ZodFirstPartyTypeKind.ZodDate:
    case z.ZodFirstPartyTypeKind.ZodBoolean:
    case z.ZodFirstPartyTypeKind.ZodNever:
    case z.ZodFirstPartyTypeKind.ZodAny:
    case z.ZodFirstPartyTypeKind.ZodUnknown:
      // No validation needed
      break;

    case z.ZodFirstPartyTypeKind.ZodString: {
      // String fields must not accept empty strings, unless they're
      // specifically allowedEmptyString
      if (schema === allowedEmptyString) break;

      const result = schema.safeParse("");
      if (result.success) {
        throw new Error(
          `String fields must not accept empty strings (${path.join(".")})`,
        );
      }
      break;
    }

    default:
      throw new Error(`Unknown schema type: ${def.typeName}`);
  }
}
