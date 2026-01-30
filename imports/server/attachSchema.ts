import type { Mongo } from "meteor/mongo";
import { MongoInternals } from "meteor/mongo";
import type { $ZodType, output } from "zod/v4/core";
import zodToMongoSchema from "zod-to-mongo-schema";

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

export default async function attachSchema<
  S extends $ZodType<Record<string, any>>,
>(schema: S, collection: Mongo.Collection<output<S>>) {
  const validator = { $jsonSchema: zodToMongoSchema(schema) };
  const db = collection.rawDatabase();

  try {
    await db.command({
      collMod: collection._name,
      validator,
    });
  } catch (error) {
    if (
      !(error instanceof MongoError) ||
      error.code !== 26 /* NamespaceNotFound */
    ) {
      throw error;
    }

    await db.createCollection(collection._name, { validator });
  }
}
