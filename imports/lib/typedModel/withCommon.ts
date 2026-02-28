import { z } from "zod";
import type { $ZodObjectConfig, $ZodShape, util } from "zod/v4/core";
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
export default function withCommon<
  Shape extends $ZodShape,
  Config extends $ZodObjectConfig,
>(
  schema: z.ZodObject<Shape, Config>,
): z.ZodObject<util.Extend<Shape, typeof CombinedFields>, Config>;
export default function withCommon<T extends z.ZodType>(
  schema: T,
): z.ZodIntersection<T, z.ZodObject<typeof CombinedFields>>;
export default function withCommon(schema: z.ZodType) {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(CombinedFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withCommon");
    }
    return schema.extend(CombinedFields);
  }
  return schema.and(z.object(CombinedFields));
}
