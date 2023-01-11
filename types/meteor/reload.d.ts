declare module 'meteor/reload' {
  namespace Reload {
    function _onMigrate(
      cb: (retry: () => void, options: { immediateMigration?: boolean }) =>
        readonly [false] | readonly [ready: true, data?: any]
    ): void;
    function _onMigrate(
      name: string,
      cb: (retry: () => void, options: { immediateMigration?: boolean }) =>
        readonly [false] | readonly [ready: true, data?: any]
    ): void;
  }
}
