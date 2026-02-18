import { MongoInternals } from "meteor/mongo";

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

export function isDuplicateKeyError(e: unknown): boolean {
  return e instanceof MongoError && e.code === 11000;
}

export default async function ignoringDuplicateKeyErrors<T>(
  fn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (!isDuplicateKeyError(e)) {
      throw e;
    }

    return Promise.resolve(undefined);
  }
}
