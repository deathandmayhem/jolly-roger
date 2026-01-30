import { z } from "zod";
import type { $ZodObjectConfig, $ZodShape, util } from "zod/v4/core";
import { createdTimestamp, updatedTimestamp } from "./customTypes";

export const TimestampFields = {
  createdAt: createdTimestamp,
  updatedAt: updatedTimestamp,
};

export default function withTimestamps<
  Shape extends $ZodShape,
  Config extends $ZodObjectConfig,
>(
  schema: z.ZodObject<Shape, Config>,
): z.ZodObject<util.Extend<Shape, typeof TimestampFields>, Config>;
export default function withTimestamps<T extends z.ZodType>(
  schema: T,
): z.ZodIntersection<T, z.ZodObject<typeof TimestampFields>>;
export default function withTimestamps(schema: z.ZodType) {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(TimestampFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withTimestamps");
    }
    return schema.extend(TimestampFields);
  }
  return schema.and(z.object(TimestampFields));
}
