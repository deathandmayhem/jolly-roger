import { z } from "zod";
import { createdUser, updatedUser } from "./customTypes";
import type { MongoRecordZodType } from "./generateJsonSchema";

export const UserFields = {
  createdBy: createdUser,
  updatedBy: updatedUser,
};

export default function withUsers<T extends MongoRecordZodType>(
  schema: T,
): T extends z.ZodObject<
  infer Shape extends z.ZodRawShape,
  infer UnknownKeys,
  infer Catchall
>
  ? z.ZodObject<Shape & typeof UserFields, UnknownKeys, Catchall>
  : z.ZodIntersection<T, z.ZodObject<typeof UserFields>> {
  if (schema instanceof z.ZodObject) {
    const alreadyContainsFields = Object.keys(UserFields).some(
      (k) => k in schema.shape,
    );
    if (alreadyContainsFields) {
      throw new Error("schema already contains fields from withUsers");
    }
  }

  return schema instanceof z.ZodObject
    ? (schema.extend(UserFields) as any)
    : (schema.and(z.object(UserFields)) as any);
}
