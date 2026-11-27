export {};

declare module "meteor/reload" {
  namespace Reload {
    // Upstream's MigrationCallback omits the options argument that Reload
    // passes to every callback
    type MigrationCallbackWithOptions = (
      retry: () => void,
      options: { immediateMigration?: boolean },
    ) => readonly [false] | readonly [ready: true, data?: unknown];

    function _onMigrate(callback: MigrationCallbackWithOptions): void;
    function _onMigrate(
      name: string,
      callback: MigrationCallbackWithOptions,
    ): void;
  }
}
