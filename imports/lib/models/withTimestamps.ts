import { z } from "zod";
import { createdTimestamp, updatedTimestamp } from "./customTypes";
import type { MongoRecordZodType } from "./generateJsonSchema";

export const TimestampFields = {
  createdAt: createdTimestamp,
  updatedAt: updatedTimestamp,
};

export default function withTimestamps<T extends MongoRecordZodType>(
  schema: T,
): T extends z.ZodObject<
  infer Shape extends z.ZodRawShape,
  infer UnknownKeys,
  infer Catchall
>
  ? z.ZodObject<Shape & typeof TimestampFields, UnknownKeys, Catchall>
  : z.ZodIntersection<T, z.ZodObject<typeof TimestampFields>> {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(TimestampFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withTimestamps");
    }
  }

  return schema instanceof z.ZodObject
    ? (schema.extend(TimestampFields) as any)
    : (schema.and(z.object(TimestampFields)) as any);
}
