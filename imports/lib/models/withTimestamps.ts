import { z } from "zod";
import { createdTimestamp, updatedTimestamp } from "./customTypes";
import type { MongoRecordZodType } from "./generateJsonSchema";

export const TimestampFields = {
  createdAt: createdTimestamp,
  updatedAt: updatedTimestamp,
};

export default function withTimestamps<T extends MongoRecordZodType>(
  schema: T,
): T extends z.ZodObject<infer Shape extends z.ZodRawShape>
  ? z.ZodObject<Shape & typeof TimestampFields>
  : z.ZodIntersection<T, z.ZodObject<typeof TimestampFields>> {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(TimestampFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withTimestamps");
    }
    return schema.extend(TimestampFields) as any;
  }

  return z.intersection(schema, z.object(TimestampFields)) as any;
}
