declare module 'meteor/google-oauth' {
  // eslint-disable-next-line import/prefer-default-export
  export module Google {
    function retrieveCredential(key: string, secret: string): any;
  }
}
