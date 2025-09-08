import util from "util";
import { MongoInternals } from "meteor/mongo";
import type {
  IndexSpecification,
  CreateIndexesOptions,
  CommandOperationOptions,
} from "mongodb";
import Logger from "../Logger";
import type { ModelIndexSpecification } from "../lib/models/Model";
import {
  AllModels,
  normalizeIndexOptions,
  normalizeIndexSpecification,
} from "../lib/models/Model";
import runIfLatestBuild from "./runIfLatestBuild";

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

type ListIndexResult = {
  v: number;
  key: IndexSpecification;
} & Omit<CreateIndexesOptions, keyof CommandOperationOptions>;

type ExistingIndexSpecification = ModelIndexSpecification & {
  name: string | undefined;
};

runIfLatestBuild(async () => {
  for (const model of AllModels) {
    const { indexes: expectedIndexes } = model;
    const collection = model.collection.rawCollection();
    let existingIndexesRaw: ListIndexResult[];
    try {
      existingIndexesRaw = await collection.listIndexes().toArray();
    } catch (error) {
      if (
        !(error instanceof MongoError) ||
        error.code !== 26 /* NamespaceNotFound */
      ) {
        throw error;
      }
      existingIndexesRaw = [];
    }
    const existingIndexes: ExistingIndexSpecification[] =
      existingIndexesRaw.map(({ v: _v, key, name, ...options }) => {
        const normalizedIndex = normalizeIndexSpecification(key);
        const normalizedOptions = normalizeIndexOptions(options);
        const stringified = JSON.stringify([
          normalizedIndex,
          normalizedOptions,
        ]);
        return {
          name,
          index: normalizedIndex,
          options: normalizedOptions,
          stringified,
        };
      });

    // We wish to compute:
    // * the set of desired indexes we need to add
    // * the set of existing indexes we need to drop, which is comprised of:
    //   * the set of existing indexes with names or definitions that collide with the set of desired new indexes, which need to be dropped before creation
    //   * the set of extra indexes that do not share a name or structure with a desired index, which we prefer to drop after doing new index creation
    const existingIndexesByName = new Map(
      existingIndexes.map((idx) => [idx.name, idx]),
    );
    const existingIndexesByStructure = new Map(
      existingIndexes.map((idx) => [idx.stringified, idx]),
    );
    const expectedIndexesByName = new Map(
      expectedIndexes.map((idx) => [idx.name, idx]),
    );
    const expectedIndexesByStructure = new Map(
      expectedIndexes.map((idx) => [idx.stringified, idx]),
    );

    // Compute which indexes need to be added.
    const missingIndexes = expectedIndexes.filter((idx) => {
      const matchingExistingStructure = existingIndexesByStructure.get(
        idx.stringified,
      );
      const matchingExistingName = existingIndexesByName.get(idx.name);
      return !(
        matchingExistingStructure &&
        matchingExistingName &&
        matchingExistingStructure === matchingExistingName
      );
    });

    // Compute which indexes need to be removed, and when
    const [extraConflicting, extraNonConflicting] = existingIndexes.reduce(
      (
        acc: [ExistingIndexSpecification[], ExistingIndexSpecification[]],
        idx: ExistingIndexSpecification,
      ) => {
        // Don't try to delete the default _id index.
        if (util.isDeepStrictEqual(idx.index, [["_id", 1]])) return acc;
        const matchingExpectedStructure = expectedIndexesByStructure.get(
          idx.stringified,
        );
        const matchingExpectedName = expectedIndexesByName.get(idx.name);
        // If an index matches both name and structure with an expected index,
        // it is desired, and not extra, so we don't modify the accumulator.
        if (
          matchingExpectedName &&
          matchingExpectedStructure &&
          matchingExpectedName === matchingExpectedStructure
        )
          return acc;
        if (matchingExpectedName || matchingExpectedStructure) {
          // It is conflicting if it matches in name but not structure or
          // structure but not name of some expected index.
          acc[0].push(idx);
        } else {
          // It is nonconflicting if it matches neither.
          acc[1].push(idx);
        }

        return acc;
      },
      [[], []],
    );

    const dropIndex = async (idx: ExistingIndexSpecification) => {
      const { name, index, options } = idx;
      if (!name) {
        Logger.warn("Unable to drop index with no name", {
          model: model.name,
          index,
          options,
          error: new Error("Unable to drop index with no name"),
        });
        return;
      }

      Logger.info("Dropping unexpected index", {
        model: model.name,
        index,
        options,
      });
      await collection.dropIndex(name);
    };

    // First, remove conflicting indexes.
    for (const conflictingIndex of extraConflicting) {
      await dropIndex(conflictingIndex);
    }
    // Then, add new indexes.
    for (const { name, index, options } of missingIndexes) {
      Logger.info("Creating new index", {
        model: model.name,
        index,
        options,
      });
      // Prefer createIndexes to createIndex so we can specify an explicit name
      // to match the one in our spec
      await collection.createIndexes(
        [{ key: Object.fromEntries(index), name }],
        Object.fromEntries(options),
      );
    }
    // Finally, drop non-conflicting indexes.
    for (const extraIndex of extraNonConflicting) {
      await dropIndex(extraIndex);
    }
  }
});
