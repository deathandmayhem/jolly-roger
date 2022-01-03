import http from 'http';

declare module 'meteor/webapp' {
  module WebApp {
    function addRuntimeConfigHook(callback: (options: {
      arch: string;
      request: http.IncomingMessage;
      encodedCurrentConfig: string;
      updated: boolean;
    }) => string | undefined | null | false): void;
    function decodeRuntimeConfig(encodedConfig: string): any;
    function encodeRuntimeConfig(config: any): string;
  }
}
