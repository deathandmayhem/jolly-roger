import type { Mongo } from "meteor/mongo";
import { MongoInternals } from "meteor/mongo";
import type { z } from "zod";
import type { MongoRecordZodType } from "../lib/models/generateJsonSchema";
import generateJsonSchema from "../lib/models/generateJsonSchema";

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

export default async function attachSchema<T extends MongoRecordZodType>(
  schema: T,
  collection: Mongo.Collection<z.output<T>>,
) {
  const validator = { $jsonSchema: generateJsonSchema(schema) };
  const db = collection.rawDatabase();

  // Ensure the collection exists (ignore if it was already created)
  try {
    await db.createCollection(collection._name);
  } catch (error) {
    if (
      !(error instanceof MongoError) ||
      error.code !== 48 /* NamespaceExists */
    ) {
      throw error;
    }
  }

  // Attach the schema validator
  await db.command({
    collMod: collection._name,
    validator,
  });
}
