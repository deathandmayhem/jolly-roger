export {};

// Meteor has no way to import Assets under ES6 modules; it's just always a
// global that all server code can access.
declare global {
  const Assets: {
    absoluteFilePath(assetPath: string): string | undefined;
  };
}
