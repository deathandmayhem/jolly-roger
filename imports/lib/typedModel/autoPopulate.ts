import { z } from "zod";
import type {
  $brand,
  $ZodBranded,
  $ZodType,
  $ZodTypes,
  JSONSchemaMeta,
} from "zod/v4/core";
import type zodToMongoSchema from "zod-to-mongo-schema";

export const AutoPopulateBrand = "autoPopulate" as const;

export interface AutoPopulate {
  when: "insert" | "update" | "always";
  value: "id" | "timestamp" | "userId";
}

declare module "zod/v4/core" {
  interface GlobalMeta
    extends JSONSchemaMeta,
      ReturnType<typeof zodToMongoSchema> {
    autoPopulate?: AutoPopulate;
  }
}

type AutoPopulatedResult<
  T extends z.ZodType,
  A extends AutoPopulate,
> = $ZodBranded<
  A["when"] extends "update" ? z.ZodOptional<T> : T,
  typeof AutoPopulateBrand,
  "in"
>;

export const autoPopulated = <T extends z.ZodType, A extends AutoPopulate>(
  schema: T,
  auto: A,
): AutoPopulatedResult<T, A> => {
  const inner = auto.when === "update" ? schema.optional() : schema;
  return inner
    .meta({ autoPopulate: auto })
    .brand<typeof AutoPopulateBrand, "in">(AutoPopulateBrand) as any;
};

export type IsAutoPopulated<T> =
  T extends $brand<typeof AutoPopulateBrand> ? true : false;
export type AutoPopulatedKeys<T> = {
  [K in keyof T]: IsAutoPopulated<T[K]> extends true ? K : never;
}[keyof T];

export interface SchemaMetadata {
  autoPopulated: Record<string, AutoPopulate>;
  defaults: Record<string, unknown>;
}

export const collectSchemaMetadata = <T extends $ZodType>(
  schema: T,
): SchemaMetadata => {
  const result: SchemaMetadata = {
    autoPopulated: {},
    defaults: {},
  };

  const inner = <T extends $ZodType>(
    raw: T,
    key: string | undefined,
    depth: number,
  ) => {
    const schema = raw as unknown as $ZodTypes;
    const { def } = schema._zod;

    const meta = z.globalRegistry.get(schema);
    if (meta?.autoPopulate) {
      if (key === undefined || depth > 1) {
        throw new Error(
          `Auto-populated fields must be at the top level of the schema`,
        );
      }

      result.autoPopulated[key] = meta.autoPopulate;
      return;
    }

    switch (def.type) {
      case "object":
        for (const [shapeKey, field] of Object.entries(def.shape)) {
          if (field === undefined) continue;
          inner(field as z.ZodType, shapeKey, depth + 1);
        }
        break;

      case "union":
        for (const option of def.options) {
          inner(option, key, depth + 1);
        }
        break;

      case "array":
        inner(def.element, key, depth + 1);
        break;

      case "tuple":
        for (const item of def.items) {
          inner(item, key, depth + 1);
        }
        break;

      case "record":
      case "map":
      case "set":
        inner(def.valueType, key, depth + 1);
        break;

      case "lazy":
        inner(def.getter(), key, depth + 1);
        break;

      case "intersection":
        inner(def.left, key, depth);
        inner(def.right, key, depth);
        break;

      case "default":
      case "prefault":
        if (depth > 1) {
          throw new Error(
            `Default values must be at the top level of the schema`,
          );
        }
        if (key !== undefined) {
          result.defaults[key] = def.defaultValue;
        }
        inner(def.innerType, key, depth);
        break;

      case "nullable":
      case "optional":
      case "nonoptional":
      case "readonly":
        inner(def.innerType, key, depth);
        break;

      default:
        // No-op
        break;
    }
  };

  inner(schema, undefined, 0);
  return result;
};
