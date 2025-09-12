import { Meteor } from "meteor/meteor";
import { z } from "zod";
import { answerify } from "../../model-helpers";
import { attachCustomJsonSchema } from "./generateJsonSchema";
import { Id } from "./regexes";

// Each of these is set to true based on the context in which the schema is
// being evaluated. They are mutually exclusive (although they can all be false)
//
// As a note: IsUpdate is set to true when generating $set operations on any
// update (upsert or not).
export const IsInsert = new Meteor.EnvironmentVariable<boolean>();
export const IsUpdate = new Meteor.EnvironmentVariable<boolean>();
export const IsUpsert = new Meteor.EnvironmentVariable<boolean>();

// Allow overriding time for testing
let clock: () => Date;
export function setClock(newClock: () => Date) {
  clock = newClock;
}
export function resetClock() {
  clock = () => new Date();
}
resetClock();

export const nonEmptyString = z.string().min(1);

// There's nothing special about this specific string schema, but
// `validateSchema` compares string fields against it by reference to determine
// whether it should explicitly whitelist a field as being allowed to be empty.
export const allowedEmptyString = z.string();

// In several of these auto-generated fields, we lie to zod about the output
// type of the field - with type assertions, we say that they are non-nullable.
// This will be true in the database, even though the transform functions don't
// always return values (e.g. createdTimestamp will always be a Date, it'll just
// get set on insertion and not on subsequent updates).

export const stringId = z
  .string()
  .regex(Id)
  .optional()
  .transform((v) => v as unknown as string);
attachCustomJsonSchema(
  stringId,
  { bsonType: "string", pattern: Id.source },
  true,
);

export const foreignKey = z.string().regex(Id);

export const snowflake = z.string().regex(/^[0-9]+$/);

// It would be nice if we could encode this in generateJsonSchema instead of
// requiring a custom type, but z.instanceof just returns a generic ZodType
// rather than something we can easily introspect (like one of the
// ZodFirstPartySchemaTypes).
export const uint8Array = z.instanceof(Uint8Array<ArrayBuffer>);
attachCustomJsonSchema(uint8Array, { bsonType: "binData" });

export const portNumber = z.number().int().positive().lte(65535);

export const deleted = z.boolean().default(false);

export const createdTimestamp = z.date().default(() => clock());
attachCustomJsonSchema(createdTimestamp, { bsonType: "date" }, true);

export const updatedTimestamp = z
  .date()
  .optional()
  .transform((v) => {
    if (v) return v;
    if (
      IsInsert.getOrNullIfOutsideFiber() ||
      IsUpsert.getOrNullIfOutsideFiber() ||
      IsUpdate.getOrNullIfOutsideFiber()
    ) {
      return clock();
    }
    return undefined as unknown as Date;
  });
attachCustomJsonSchema(updatedTimestamp, { bsonType: "date" });

export const createdUser = foreignKey.optional().transform((v) => {
  if (v) return v;
  try {
    if (IsInsert.get() || IsUpsert.get()) return Meteor.userId()!;
  } catch (e) {
    /* ignore */
  }
  return undefined as unknown as string;
});
attachCustomJsonSchema(
  createdUser,
  { bsonType: "string", pattern: Id.source },
  true,
);

export const updatedUser = foreignKey.optional().transform((v) => {
  if (v) return v;
  try {
    if (IsUpdate.get()) return Meteor.userId() ?? undefined;
  } catch (e) {
    /* ignore */
  }
  return undefined;
});
attachCustomJsonSchema(updatedUser, { bsonType: "string", pattern: Id.source });

export const answer = nonEmptyString.transform((v) => answerify(v));
attachCustomJsonSchema(answer, { bsonType: "string" });
