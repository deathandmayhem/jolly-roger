import type { Mongo } from "meteor/mongo";
import { MongoInternals } from "meteor/mongo";
import type { $ZodType, output } from "zod/v4/core";
import zodToMongoSchema from "zod-to-mongo-schema";

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

export default async function attachSchema<
  S extends $ZodType<Record<string, any>>,
>(schema: S, collection: Mongo.Collection<output<S>>) {
  const validator = {
    $jsonSchema: zodToMongoSchema(schema, { strict: false }),
  };
  const db = collection.rawDatabase();

  // Ensure the collection exists (ignore if it was already created)
  try {
    await db.createCollection(collection._name);
  } catch (error) {
    if (
      !(error instanceof MongoError) ||
      error.code !== 48 /* NamespaceExists */
    ) {
      throw new Error(
        `Failed to attach schema to collection ${collection._name}: ${error}\nValidator: ${JSON.stringify(validator, null, 2)}`,
        { cause: error },
      );
    }
  }

  // Attach the schema validator
  try {
    await db.command({
      collMod: collection._name,
      validator,
    });
  } catch (error) {
    throw new Error(
      `Failed to attach schema to collection ${collection._name}: ${error}\nValidator: ${JSON.stringify(validator, null, 2)}`,
      { cause: error },
    );
  }
}
