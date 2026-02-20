declare module "meteor/google-oauth" {
  export namespace Google {
    function requestCredential(callback: (token: string) => void): void;
    function requestCredential(
      options: any,
      callback: (token: string) => void,
    ): void;
    function retrieveCredential(key: string, secret: string): any;
  }
}
