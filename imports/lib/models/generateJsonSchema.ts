/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-underscore-dangle -- we cannot control _zod */
import * as z from "zod/v4/core";
import { Email, URL, UUID } from "./regexes";

// This file is heavily inspired by zod-to-json-schema, but we use our own
// version because (a) zod-to-json-schema supports a different version of
// json-schema than MongoDB (b) we wanted support for custom schema declarations

export type MongoRecordZodType =
  | z.$ZodObject<any>
  | z.$ZodUnion<any>
  | z.$ZodDiscriminatedUnion<any>
  | z.$ZodIntersection<any, any>;
//  | z.$ZodRecord<any, any>;

type BsonType =
  | "double"
  | "string"
  | "object"
  | "array"
  | "binData"
  | "undefined"
  | "objectId"
  | "bool"
  | "date"
  | "null"
  | "regex"
  | "dbPointer"
  | "javascript"
  | "symbol"
  | "javascriptWithScope"
  | "int"
  | "timestamp"
  | "long"
  | "decimal"
  | "minKey"
  | "maxKey"
  | "number";

export interface JsonSchema {
  bsonType?: BsonType;
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

function stringToSchema(def: z.$ZodStringDef): JsonSchema {
  const bsonType = "string";

  const constraints = (def.checks ?? []).reduce<Partial<JsonSchema>>(
    (acc, check) => {
      const checkDef = check._zod.def;
      switch (checkDef.check) {
        case "min_length":
          return {
            ...acc,
            minLength: acc.minLength
              ? Math.max(
                  acc.minLength,
                  (checkDef as z.$ZodCheckMinLengthDef).minimum,
                )
              : (checkDef as z.$ZodCheckMinLengthDef).minimum,
          };
        case "max_length":
          return {
            ...acc,
            maxLength: acc.maxLength
              ? Math.min(
                  acc.maxLength,
                  (checkDef as z.$ZodCheckMaxLengthDef).maximum,
                )
              : (checkDef as z.$ZodCheckMaxLengthDef).maximum,
          };
        case "length_equals":
          return {
            ...acc,
            minLength: acc.minLength
              ? Math.max(
                  acc.minLength,
                  (checkDef as z.$ZodCheckLengthEqualsDef).length,
                )
              : (checkDef as z.$ZodCheckLengthEqualsDef).length,
            maxLength: acc.maxLength
              ? Math.min(
                  acc.maxLength,
                  (checkDef as z.$ZodCheckLengthEqualsDef).length,
                )
              : (checkDef as z.$ZodCheckLengthEqualsDef).length,
          };
        case "string_format": {
          let pattern;
          const { format } = checkDef as z.$ZodCheckStringFormatDef;
          switch (format) {
            case "regex":
              pattern = (checkDef as z.$ZodCheckRegexDef).pattern;
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
            default:
              throw new Error(
                `Unimplemented string_format check format ${format}`,
              );
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
          throw new Error(`Unsupported string check: ${checkDef.check}`);
      }
    },
    {},
  );

  return {
    bsonType,
    ...constraints,
  };
}

function numberToSchema(def: z.$ZodNumberDef): JsonSchema {
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
function potentialObjectKeys<T extends z.ZodType>(
  schema: T,
): [keys: Set<string>, catchall: boolean] {
  const { def } = schema._zod;
  switch (def.type) {
    case "string":
    case "number":
    case "date":
    case "boolean":
    case "null":
    case "any":
    case "unknown":
    case "array":
    case "tuple":
    case "enum":
      return [new Set(), false];
    case "object":
      return [
        new Set(Object.keys(def.shape)),
        !(def.catchall instanceof z.ZodNever),
      ];
    case "record":
      return [new Set(), true];
    case "union":
      return def.options.reduce<[keys: Set<string>, catchall: boolean]>(
        ([keys, catchall], option) => {
          const [optionKeys, optionCatchall] = potentialObjectKeys(option);
          return [
            new Set([...keys, ...optionKeys]),
            catchall || optionCatchall,
          ];
        },
        [new Set(), false],
      );
    case "intersection": {
      const [leftKeys, leftCatchall] = potentialObjectKeys(def.left);
      const [rightKeys, rightCatchall] = potentialObjectKeys(def.right);
      return [
        new Set([...leftKeys, ...rightKeys]),
        leftCatchall || rightCatchall,
      ];
    }
    case "literal":
      return [new Set(Object.keys(def.values)), false];
    case "optional":
    case "nullable":
    case "default":
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

function tupleToSchema(def: z.$ZodTupleDef<any>): JsonSchema {
  return {
    bsonType: "array",
    items: def.items.map(schemaToJsonSchema),
    additionalItems: def.rest ? schemaToJsonSchema(def.rest) : false,
  };
}

function recordToSchema(def: z.$ZodRecordDef<any>): JsonSchema {
  if (!(def.keyType instanceof z.$ZodString)) {
    throw new Error("Record key type must be string");
  }

  const keyTypeDef = def.keyType._zod.def;
  if (keyTypeDef.checks) {
    throw new Error("Record key type checks are not supported");
  }

  return {
    bsonType: "object",
    additionalProperties: schemaToJsonSchema(def.valueType),
  };
}

function enumToSchema(def: z.$ZodEnumDef): JsonSchema {
  console.log("Trying to enumToSchema", def);
  console.log("def.entries = ", def.entries);
  return {
    enum: [...def.entries.values],
  };
}

// When used in an object, an optional type allows the key to be absent. (And we
// handle that constraint as part of handling objects.) However on its own, an
// optional type just means that the value can be undefined. That's not very
// useful with json-schema or Mongo, neither of which can represent undefined.
// So just return the inner type to keep our schema as simpler.
function optionalToSchema(
  def: z.$ZodOptionalDef<any>,
  allowedKeys: Set<string>,
  catchall: boolean,
): JsonSchema {
  return schemaToJsonSchema(def.innerType, allowedKeys, catchall);
}

function nullableToSchema(
  def: z.$ZodNullableDef<any>,
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
  def: z.$ZodDefaultDef<any>,
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
export function schemaToJsonSchema<T extends z.$ZodType>(
  schema: T,
  allowedKeys: Set<string> = new Set(),
  catchall = false,
): JsonSchema {
  if ("customJsonSchema" in schema && schema.customJsonSchema) {
    return schema.customJsonSchema;
  }

  const { def } = schema._zod;
  switch (def.type) {
    // scalars
    case "string":
      return stringToSchema(def);
    case "number":
      return numberToSchema(def);
    case "date":
      return dateToSchema(def);
    case "literal":
      return literalToSchema(def);
    case "boolean":
      return { bsonType: "bool" };
    case "null":
      return { bsonType: "null" };
    // Treat "unknown" as any. They have different meanings at the type layer,
    // but at the database layer, they're equivalent
    case "unknown":
    case "any":
      return {};

    // collections
    case "array":
      return arrayToSchema(def);
    case "object":
      return objectToSchema(def, allowedKeys, catchall);
    case "union":
      return unionToSchema(def, allowedKeys, catchall);
    // TODO: investigate disc. union
    //    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
    //      return discriminatedUnionToSchema(def, allowedKeys, catchall);
    case "intersection":
      return intersectionToSchema(def, allowedKeys, catchall);
    case "tuple":
      return tupleToSchema(def);
    case "record":
      return recordToSchema(def);
    case "enum":
      return enumToSchema(def);
    case "optional":
      return optionalToSchema(def, allowedKeys, catchall);
    case "nullable":
      return nullableToSchema(def, allowedKeys, catchall);
    case "default":
      return defaultToSchema(def, allowedKeys, catchall);
    default:
      throw new Error(
        `Unsupported schema type: ${def.type}; use customJsonSchema instead`,
      );
  }
}

export function attachCustomJsonSchema<T extends z.$ZodTypes>(
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
