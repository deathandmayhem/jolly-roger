import { MongoInternals } from 'meteor/mongo';

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

export default function ignoringDuplicateKeyErrors<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    // 11000 is a duplicate key error
    if (!(e instanceof MongoError) || e.code !== 11000) {
      throw e;
    }

    return undefined;
  }
}
