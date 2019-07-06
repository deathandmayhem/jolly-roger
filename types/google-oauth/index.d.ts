declare module 'meteor/google-oauth' {
  // eslint-disable-next-line import/prefer-default-export
  export module Google {
    function requestCredential(callback: (token: string) => void): void;
    function requestCredential(options: any, callback: (token: string) => void): void;
    function retrieveCredential(key: string, secret: string): any;
  }
}
