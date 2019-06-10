declare module 'meteor/percolate:migrations' {
  type Logger = (opts: {
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    tag: 'Migrations',
  }) => void;

  // eslint-disable-next-line import/prefer-default-export
  export module Migrations {
    function config(opts: {
      log?: boolean,
      logger?: Logger,
    }): void;
    function add(migration: {
      version: number,
      name?: string,
      up: Function,
      down?: Function,
    }): void;
    function migrateTo(command: string | number): void;
    function getVersion(): number;
    function unlock(): void;
  }
}
