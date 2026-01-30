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
