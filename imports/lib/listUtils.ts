interface ObjectWithId {
  _id: string;
}

export function indexedBy<T>(
  list: T[],
  k: keyof T | ((val: T) => string),
  allowDuplicates = false,
): Map<string, T> {
  const retval = new Map();
  list.forEach((item) => {
    const key = k instanceof Function ? k(item) : item[k];
    if (!allowDuplicates && retval.has(key)) {
      throw new Error(`Duplicate ${String(k)} ${key} passed to indexedBy`);
    }
    retval.set(key, item);
  });
  return retval;
}

export function indexedById<T extends ObjectWithId>(list: T[]): Map<string, T> {
  const retval = new Map();
  list.forEach((item) => {
    if (retval.has(item._id)) {
      throw new Error(`Duplicate id ${item._id} passed to indexedById`);
    }
    retval.set(item._id, item);
  });
  return retval;
}

export function difference<T>(universe: T[], removed: T[]): T[] {
  const index = new Map<T, boolean>();
  removed.forEach((item) => {
    index.set(item, true);
  });
  return universe.filter((item) => !index.has(item));
}

export function sortedBy<T extends object, U>(
  list: T[],
  fn: (obj: T) => U,
): T[] {
  // Returns a copy of the provided `list` sorted (ascending) by the result
  // of applying `fn` to each element in the list.
  const sortKeys = new WeakMap();
  list.forEach((item) => {
    sortKeys.set(item, fn(item));
  });
  const retval = [...list];
  retval.sort((a, b) => {
    const aKey = sortKeys.get(a);
    const bKey = sortKeys.get(b);
    if (aKey === bKey) {
      return 0;
    } else if (aKey < bKey) {
      return -1;
    } else {
      return 1;
    }
  });
  return retval;
}

export function groupedBy<T>(
  list: T[],
  fn: (obj: T) => string,
): Map<string, T[]> {
  const groupIndex = new Map();
  list.forEach((item) => {
    const groupKey = fn(item);
    if (!groupIndex.has(groupKey)) {
      groupIndex.set(groupKey, []);
    }
    groupIndex.get(groupKey).push(item);
  });
  return groupIndex;
}
