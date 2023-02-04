import util from 'util';
import { MongoInternals } from 'meteor/mongo';
import type { IndexSpecification, CreateIndexesOptions, CommandOperationOptions } from 'mongodb';
import Logger from '../Logger';
import type { ModelIndexSpecification } from '../lib/models/Model';
import { AllModels, normalizeIndexOptions, normalizeIndexSpecification } from '../lib/models/Model';
import runIfLatestBuild from './runIfLatestBuild';

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

type ListIndexResult = {
  v: number;
  key: IndexSpecification;
} & Omit<CreateIndexesOptions, keyof CommandOperationOptions>;

type ExistingIndexSpecification = ModelIndexSpecification & {
  name: string | undefined;
}

runIfLatestBuild(async () => {
  for (const model of AllModels) {
    const { indexes: expectedIndexes } = model;
    const collection = model.collection.rawCollection();
    let existingIndexesRaw: ListIndexResult[];
    try {
      existingIndexesRaw = await collection.listIndexes().toArray();
    } catch (error) {
      if (!(error instanceof MongoError) || error.code !== 26 /* NamespaceNotFound */) {
        throw error;
      }
      existingIndexesRaw = [];
    }
    const existingIndexes: ExistingIndexSpecification[] = existingIndexesRaw.map(({
      v: _v, key, name, ...options
    }) => {
      const normalizedIndex = normalizeIndexSpecification(key);
      const normalizedOptions = normalizeIndexOptions(options);
      const stringified = JSON.stringify([normalizedIndex, normalizedOptions]);
      return {
        name,
        index: normalizedIndex,
        options: normalizedOptions,
        stringified,
      };
    });

    const existingIndexSet = new Set(existingIndexes.map(({ stringified }) => stringified));
    const expectedIndexSet = new Set(expectedIndexes.map(({ stringified }) => stringified));

    const missingIndexes = expectedIndexes
      .filter(({ stringified }) => !existingIndexSet.has(stringified));
    const extraIndexes = existingIndexes
      .filter(({ index, stringified }) => {
        // Don't (try to) delete the default _id index
        return !util.isDeepStrictEqual(index, [['_id', 1]]) &&
          !expectedIndexSet.has(stringified);
      });

    for (const { index, options } of missingIndexes) {
      Logger.info('Creating new index', {
        model: model.name,
        index,
        options,
      });
      await collection.createIndex(index, Object.fromEntries(options));
    }
    for (const { name, index, options } of extraIndexes) {
      if (!name) {
        Logger.warn('Unable to drop index with no name', {
          model: model.name,
          index,
          options,
          error: new Error('Unable to drop index with no name'),
        });
        continue;
      }

      Logger.info('Dropping unexpected index', {
        model: model.name,
        index,
        options,
      });
      await collection.dropIndex(name);
    }
  }
});
