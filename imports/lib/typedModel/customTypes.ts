import { z } from "zod";
import { autoPopulated } from "./autoPopulate";
import { Id } from "./regexes";

export const nonEmptyString = z.string().min(1);

// There's nothing special about this specific string schema, but
// `validateSchema` compares string fields against it by reference to determine
// whether it should explicitly whitelist a field as being allowed to be empty.
export const allowedEmptyString = z.string();

export const stringId = autoPopulated(z.string().regex(Id), {
  when: "insert",
  value: "id",
});

export const foreignKey = z.string().regex(Id);

export const snowflake = z.string().regex(/^[0-9]+$/);

export const uint8Array = z
  .instanceof(Uint8Array<ArrayBuffer>)
  .meta({ bsonType: "binData" });

export const portNumber = z.int32();

export const deleted = z.boolean().default(false);

export const createdTimestamp = autoPopulated(z.date(), {
  when: "insert",
  value: "timestamp",
});

export const updatedTimestamp = autoPopulated(z.date(), {
  when: "always",
  value: "timestamp",
});

export const createdUser = autoPopulated(foreignKey, {
  when: "insert",
  value: "userId",
});

export const updatedUser = autoPopulated(foreignKey, {
  when: "update",
  value: "userId",
});

export const answer = z.string().regex(/^[^a-z]+$/);
