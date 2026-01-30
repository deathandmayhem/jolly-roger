import type { NpmModuleMongodb } from "meteor/npm-mongo";

type CreateIndexesOptions = NpmModuleMongodb.CreateIndexesOptions;
type IndexDirection = NpmModuleMongodb.IndexDirection;
export type IndexSpecification = NpmModuleMongodb.IndexSpecification;

export type NormalizedIndexSpecification = readonly [string, IndexDirection][];

const AllowedIndexOptions = [
  "unique",
  "sparse",
  "partialFilterExpression",
  "expireAfterSeconds",
] as const;
type AllowedIndexOptionsType = (typeof AllowedIndexOptions)[number];
export type IndexOptions = Pick<CreateIndexesOptions, AllowedIndexOptionsType>;
type NormalizedIndexOptions = [AllowedIndexOptionsType, any][];

export interface ModelIndexSpecification {
  name: string | undefined;
  index: NormalizedIndexSpecification;
  options: NormalizedIndexOptions;
  // JSON-serialize [index, options] to make it easier to compare against
  // existing indexes
  stringified: string;
}

function indexIsField(index: any): index is string {
  return typeof index === "string";
}

function indexIsFieldDirectionPair(
  index: any,
): index is readonly [string, IndexDirection] {
  return (
    Array.isArray(index) && index.length === 2 && typeof index[0] === "string"
  );
}

function indexIsObject(index: any): index is Record<string, IndexDirection> {
  return typeof index === "object" && index !== null && !Array.isArray(index);
}

function indexIsMap(index: any): index is Map<string, IndexDirection> {
  return index instanceof Map;
}

export function normalizeIndexSpecification(
  index: IndexSpecification,
): NormalizedIndexSpecification {
  // An index specification can be a:
  // - string
  // - array with the first element as field name and the second element as
  //   direction
  // - object with keys as field names and values as direction (note that ES2015
  //   and later preserves object insertion order for string keys)
  // - Map with keys as field names and values as direction
  // - An array mix-and-matching any of the above So we need to detect each of
  //   them and normalize to a single format (array of arrays)
  if (indexIsField(index)) {
    return [[index, 1]];
  } else if (indexIsFieldDirectionPair(index)) {
    return [index];
  } else if (indexIsObject(index)) {
    return Object.entries(index);
  } else if (indexIsMap(index)) {
    return [...index];
  } else {
    return index.flatMap(normalizeIndexSpecification);
  }
}

export function normalizeIndexOptions(
  options: CreateIndexesOptions,
): NormalizedIndexOptions {
  return Object.entries(options)
    .filter((v): v is [AllowedIndexOptionsType, any] => {
      return AllowedIndexOptions.includes(v[0] as any);
    })
    .toSorted((a, b) => a[0].localeCompare(b[0]));
}
