import { z } from "zod";
import type { $ZodObjectConfig, $ZodShape, util } from "zod/v4/core";
import { createdUser, updatedUser } from "./customTypes";

export const UserFields = {
  createdBy: createdUser,
  updatedBy: updatedUser,
};

export default function withUsers<
  Shape extends $ZodShape,
  Config extends $ZodObjectConfig,
>(
  schema: z.ZodObject<Shape, Config>,
): z.ZodObject<util.Extend<Shape, typeof UserFields>, Config>;
export default function withUsers<T extends z.ZodType>(
  schema: T,
): z.ZodIntersection<T, z.ZodObject<typeof UserFields>>;
export default function withUsers(schema: z.ZodType) {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(UserFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withUsers");
    }
    return schema.extend(UserFields);
  }
  return schema.and(z.object(UserFields));
}
