declare module 'meteor/reload' {
  namespace Reload {
    function _onMigrate(
      cb: (retry: () => void, options: { immediateMigration?: boolean }) =>
        [false] | [ready: true, data?: any]
    ): void;
    function _onMigrate(
      name: string,
      cb: (retry: () => void, options: { immediateMigration?: boolean }) =>
        [false] | [ready: true, data?: any]
    ): void;
    function _migrationData(name: string): unknown;
  }
}
