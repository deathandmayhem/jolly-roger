declare module 'meteor/xolvio:cleaner' {
  export function resetDatabase(
    options?: { excludedCollections: string[] },
    callback?: () => void,
  ): void;
}
