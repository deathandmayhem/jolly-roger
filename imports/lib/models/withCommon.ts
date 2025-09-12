import { z } from "zod";
import type { MongoRecordZodType } from "./generateJsonSchema";
import { TimestampFields } from "./withTimestamps";
import { UserFields } from "./withUsers";

const CombinedFields = {
  ...TimestampFields,
  ...UserFields,
};

// We could compose withTimestamps and withUsers, but in the case that the
// passed in schema is not a ZodObject, we'd end up creating multiple nested
// intersections, so this makes the resulting schema (and type) slightly (though
// only slightly) cleaner.
export default function withCommon<T extends MongoRecordZodType>(
  schema: T,
): T extends z.ZodObject<
  infer Shape extends z.ZodRawShape,
  infer UnknownKeys,
  infer Catchall
>
  ? z.ZodObject<
      Shape & typeof TimestampFields & typeof UserFields,
      UnknownKeys,
      Catchall
    >
  : z.ZodIntersection<
      T,
      z.ZodObject<typeof TimestampFields & typeof UserFields>
    > {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(CombinedFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withCommon");
    }
  }

  return schema instanceof z.ZodObject
    ? (schema.extend(CombinedFields) as any)
    : (schema.and(z.object(CombinedFields)) as any);
}
