/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Mongo } from "meteor/mongo";
import { z } from "zod";
import { Email, URL, UUID } from "./regexes";

// This file is heavily inspired by zod-to-json-schema, but we use our own
// version because (a) zod-to-json-schema supports a different version of
// json-schema than MongoDB (b) we wanted support for custom schema declarations

export type MongoRecordZodType =
  | z.AnyZodObject
  | z.ZodUnion<any>
  | z.ZodDiscriminatedUnion<any, any>
  | z.ZodIntersection<any, any>
  | z.ZodRecord<any, any>;

export interface JsonSchema {
  bsonType?: Mongo.BsonType & string;
  enum?: readonly any[];
  allOf?: readonly JsonSchema[];
  anyOf?: readonly JsonSchema[];
  not?: JsonSchema;

  // string
  pattern?: string;
  minLength?: number;
  maxLength?: number;

  // number
  minimum?: number;
  exclusiveMinimum?: boolean;
  maximum?: number;
  exclusiveMaximum?: boolean;
  multipleOf?: number;

  // array/tuple
  items?: JsonSchema | readonly JsonSchema[];
  additionalItems?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // object
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  required?: readonly string[];
}

function stringToSchema(def: z.ZodStringDef): JsonSchema {
  const bsonType = "string";

  const constraints = def.checks.reduce<Partial<JsonSchema>>((acc, check) => {
    switch (check.kind) {
      case "min":
        return {
          ...acc,
          minLength: acc.minLength
            ? Math.max(acc.minLength, check.value)
            : check.value,
        };
      case "max":
        return {
          ...acc,
          maxLength: acc.maxLength
            ? Math.min(acc.maxLength, check.value)
            : check.value,
        };
      case "length":
        return {
          ...acc,
          minLength: acc.minLength
            ? Math.max(acc.minLength, check.value)
            : check.value,
          maxLength: acc.maxLength
            ? Math.min(acc.maxLength, check.value)
            : check.value,
        };
      case "regex":
      case "email":
      case "uuid":
      case "url": {
        let pattern;
        // eslint-disable-next-line default-case
        switch (check.kind) {
          case "regex":
            pattern = check.regex;
            break;
          case "email":
            pattern = Email;
            break;
          case "uuid":
            pattern = UUID;
            break;
          case "url":
            pattern = URL;
            break;
        }
        if (pattern.flags !== "") {
          throw new Error("Regex flags are not supported");
        }

        return {
          ...acc,
          ...(acc.pattern
            ? {
                allOf: [...(acc.allOf ?? []), { pattern: pattern.source }],
              }
            : { pattern: pattern.source }),
        };
      }
      default:
        throw new Error(`Unsupported string check: ${check.kind}`);
    }
  }, {});

  return {
    bsonType,
    ...constraints,
  };
}

function numberToSchema(def: z.ZodNumberDef): JsonSchema {
  const constraints = def.checks.reduce<Partial<JsonSchema>>((acc, check) => {
    switch (check.kind) {
      case "int":
        return {
          ...acc,
          bsonType: "int",
        };
      case "min": {
        let value;
        let exclusive;
        if (check.value > (acc.minimum ?? -Infinity)) {
          value = check.value;
          exclusive = !check.inclusive;
        } else if (check.value === acc.minimum) {
          value = check.value;
          exclusive = acc.exclusiveMinimum! || !check.inclusive;
        } else {
          value = acc.minimum;
          exclusive = acc.exclusiveMinimum;
        }
        return {
          ...acc,
          minimum: value,
          exclusiveMinimum: exclusive,
        };
      }
      case "max": {
        let value;
        let exclusive;
        if (check.value < (acc.maximum ?? Infinity)) {
          value = check.value;
          exclusive = !check.inclusive;
        } else if (check.value === acc.maximum) {
          value = check.value;
          exclusive = acc.exclusiveMaximum! || !check.inclusive;
        } else {
          value = acc.maximum;
          exclusive = acc.exclusiveMaximum;
        }
        return {
          ...acc,
          maximum: value,
          exclusiveMaximum: exclusive,
        };
      }
      case "multipleOf":
        return {
          ...acc,
          ...(acc.multipleOf
            ? {
                allOf: [...(acc.allOf ?? []), { multipleOf: check.value }],
              }
            : { multipleOf: check.value }),
        };
      default:
        throw new Error(`Unsupported number check: ${check.kind}`);
    }
  }, {});

  return {
    // Default to accepting any numeric type, but this will be overwritten by
    // constraints if an int was specifically requested
    bsonType: "number",
    ...constraints,
  };
}

function dateToSchema(def: z.ZodDateDef): JsonSchema {
  if (def.checks.length > 0) {
    throw new Error("Date schema checks are not supported");
  }

  return {
    bsonType: "date",
  };
}

function literalToSchema(def: z.ZodLiteralDef): JsonSchema {
  return {
    enum: [def.value],
  };
}

function arrayToSchema(def: z.ZodArrayDef<any>): JsonSchema {
  const minItems =
    def.minLength || def.exactLength
      ? Math.max(def.minLength?.value ?? 0, def.exactLength?.value ?? 0)
      : undefined;
  const maxItems =
    def.maxLength || def.exactLength
      ? Math.min(
          def.maxLength?.value ?? Infinity,
          def.exactLength?.value ?? Infinity,
        )
      : undefined;
  return {
    bsonType: "array",
    items: schemaToJsonSchema(def.type),
    ...(minItems ? { minItems } : {}),
    ...(maxItems ? { maxItems } : {}),
  };
}

function objectToSchema(
  def: z.ZodObjectDef,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  let additionalProperties: JsonSchema["additionalProperties"];
  if (catchall) {
    additionalProperties = true;
  } else if (!(def.catchall instanceof z.ZodNever)) {
    additionalProperties = schemaToJsonSchema(def.catchall);
  } else if (def.unknownKeys === "passthrough") {
    additionalProperties = true;
  } else {
    additionalProperties = false;
  }

  const inheritedProperties: Record<string, JsonSchema> = Object.fromEntries(
    [...allowedKeys].map((key) => [key, {}]),
  );
  const properties = Object.entries(def.shape()).reduce<
    Record<string, JsonSchema>
  >((acc, [key, value]) => {
    acc[key] = schemaToJsonSchema(value);
    return acc;
  }, inheritedProperties);
  const required = Object.entries(def.shape())
    .filter(([_, value]) => {
      return (
        !value.isOptional() ||
        ("customJsonSchemaRequired" in value && value.customJsonSchemaRequired)
      );
    })
    .map(([key]) => key);

  const schema: JsonSchema = {
    bsonType: "object",
    properties,
    required,
    additionalProperties,
  };

  if (schema.required?.length === 0) {
    delete schema.required;
  }

  return schema;
}

function unionToSchema(
  def: z.ZodUnionDef,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  return {
    anyOf: def.options.map((option) =>
      schemaToJsonSchema(option, allowedKeys, catchall),
    ),
  };
}

function discriminatedUnionToSchema(
  def: z.ZodDiscriminatedUnionDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  // Mongo can't do anything special with a discriminated union
  return {
    anyOf: def.options.map((option) =>
      schemaToJsonSchema(option, allowedKeys, catchall),
    ),
  };
}

// Return anything that could potentially be a valid object on one half of an
// intersection - we'll make sure it's allowed on the other half
function potentialObjectKeys<T extends z.ZodFirstPartySchemaTypes>(
  schema: T,
): [keys: Set<string>, catchall: boolean] {
  const { _def: def } = schema;
  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
    case z.ZodFirstPartyTypeKind.ZodNumber:
    case z.ZodFirstPartyTypeKind.ZodDate:
    case z.ZodFirstPartyTypeKind.ZodBoolean:
    case z.ZodFirstPartyTypeKind.ZodNull:
    case z.ZodFirstPartyTypeKind.ZodAny:
    case z.ZodFirstPartyTypeKind.ZodUnknown:
    case z.ZodFirstPartyTypeKind.ZodArray:
    case z.ZodFirstPartyTypeKind.ZodTuple:
    case z.ZodFirstPartyTypeKind.ZodEnum:
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
      return [new Set(), false];
    case z.ZodFirstPartyTypeKind.ZodObject:
      return [
        new Set(Object.keys(def.shape())),
        !(def.catchall instanceof z.ZodNever),
      ];
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return [new Set(), true];
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return (def.options as z.ZodDiscriminatedUnionOption<any>[]).reduce<
        [keys: Set<string>, catchall: boolean]
      >(
        ([keys, catchall], option) => {
          const [optionKeys, optionCatchall] = potentialObjectKeys(option);
          return [
            new Set([...keys, ...optionKeys]),
            catchall || optionCatchall,
          ];
        },
        [new Set(), false],
      );
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return (def.options as z.ZodTypeAny[]).reduce<
        [keys: Set<string>, catchall: boolean]
      >(
        ([keys, catchall], option) => {
          const [optionKeys, optionCatchall] = potentialObjectKeys(option);
          return [
            new Set([...keys, ...optionKeys]),
            catchall || optionCatchall,
          ];
        },
        [new Set(), false],
      );
    case z.ZodFirstPartyTypeKind.ZodIntersection: {
      const [leftKeys, leftCatchall] = potentialObjectKeys(def.left);
      const [rightKeys, rightCatchall] = potentialObjectKeys(def.right);
      return [
        new Set([...leftKeys, ...rightKeys]),
        leftCatchall || rightCatchall,
      ];
    }
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return [
        typeof def.value === "object" && !Array.isArray(def.value)
          ? new Set(Object.keys(def.value))
          : new Set(),
        false,
      ];
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return potentialObjectKeys(def.schema);
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodNullable:
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return potentialObjectKeys(def.innerType);
    default:
      throw new Error(`Unexpected schema type: ${def.typeName}`);
  }
}

function intersectionToSchema(
  def: z.ZodIntersectionDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  const [leftKeys, leftCatchall] = potentialObjectKeys(def.left);
  const [rightKeys, rightCatchall] = potentialObjectKeys(def.right);

  return {
    allOf: [
      schemaToJsonSchema(
        def.left,
        new Set([...rightKeys, ...allowedKeys]),
        rightCatchall || catchall,
      ),
      schemaToJsonSchema(
        def.right,
        new Set([...leftKeys, ...allowedKeys]),
        leftCatchall || catchall,
      ),
    ],
  };
}

function tupleToSchema(def: z.ZodTupleDef<any>): JsonSchema {
  return {
    bsonType: "array",
    items: def.items.map(schemaToJsonSchema),
    additionalItems: def.rest ? schemaToJsonSchema(def.rest) : false,
  };
}

function recordToSchema(def: z.ZodRecordDef<any>): JsonSchema {
  if (!(def.keyType instanceof z.ZodString)) {
    throw new Error("Record key type must be string");
  }

  if (def.keyType._def.checks.length > 0) {
    throw new Error("Record key type checks are not supported");
  }

  return {
    bsonType: "object",
    additionalProperties: schemaToJsonSchema(def.valueType),
  };
}

function enumToSchema(def: z.ZodEnumDef): JsonSchema {
  return {
    enum: def.values,
  };
}

function nativeEnumToSchema(def: z.ZodNativeEnumDef): JsonSchema {
  return {
    enum: Object.values(def.values),
  };
}

// When used in an object, an optional type allows the key to be absent. (And we
// handle that constraint as part of handling objects.) However on its own, an
// optional type just means that the value can be undefined. That's not very
// useful with json-schema or Mongo, neither of which can represent undefined.
// So just return the inner type to keep our schema as simpler.
function optionalToSchema(
  def: z.ZodOptionalDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  return schemaToJsonSchema(def.innerType, allowedKeys, catchall);
}

function nullableToSchema(
  def: z.ZodNullableDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  if (def.innerType.isNullable()) {
    return schemaToJsonSchema(def.innerType, allowedKeys, catchall);
  }

  return {
    anyOf: [
      { bsonType: "null" },
      schemaToJsonSchema(def.innerType, allowedKeys, catchall),
    ],
  };
}

// This should be the not-nullable version of the inner type, since the default
// must match the inner type.
function defaultToSchema(
  def: z.ZodDefaultDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  return {
    allOf: [
      { not: { bsonType: "null" } },
      schemaToJsonSchema(def.innerType, allowedKeys, catchall),
    ],
  };
}

// The allowedKeys and catchall parameters exist for the benefit of intersection
// types, since the semantics of a TypeScript intersection and json-schema's
// allOf are not the same. With TypeScript, intersecting two types allows
// properties which are defined on one but not the other, whereas with
// json-schema, if one branch of an allOf rejects a property, the whole schema
// is rejected.
//
// To work around that, we need to detect if one side of an intersection is
// object-like, and push the properties it allows into the other side.
export function schemaToJsonSchema<T extends z.ZodFirstPartySchemaTypes>(
  schema: T,
  allowedKeys: Set<string> = new Set(),
  catchall = false,
): JsonSchema {
  if ("customJsonSchema" in schema && schema.customJsonSchema) {
    return schema.customJsonSchema;
  }

  const { _def: def } = schema;
  switch (def.typeName) {
    // scalars
    case z.ZodFirstPartyTypeKind.ZodString:
      return stringToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return numberToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodDate:
      return dateToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return literalToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { bsonType: "bool" };
    case z.ZodFirstPartyTypeKind.ZodNull:
      return { bsonType: "null" };
    // Treat "unknown" as any. They have different meanings at the type layer,
    // but at the database layer, they're equivalent
    case z.ZodFirstPartyTypeKind.ZodUnknown:
    case z.ZodFirstPartyTypeKind.ZodAny:
      return {};

    // collections
    case z.ZodFirstPartyTypeKind.ZodArray:
      return arrayToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodObject:
      return objectToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return unionToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return discriminatedUnionToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodIntersection:
      return intersectionToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodTuple:
      return tupleToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return recordToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return enumToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
      return nativeEnumToSchema(def);
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return optionalToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return nullableToSchema(def, allowedKeys, catchall);
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return defaultToSchema(def, allowedKeys, catchall);
    default:
      throw new Error(
        `Unsupported schema type: ${def.typeName}; use customJsonSchema instead`,
      );
  }
}

export function attachCustomJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  customSchema: JsonSchema,
  required = false,
) {
  (schema as any).customJsonSchema = customSchema;
  (schema as any).customJsonSchemaRequired = required;
}

export default function generateJsonSchema<T extends MongoRecordZodType>(
  schema: T,
): JsonSchema {
  return schemaToJsonSchema(schema);
}
