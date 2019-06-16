declare module 'meteor/oauth' {
  // eslint-disable-next-line import/prefer-default-export
  export module OAuth {
    function _redirectUri(service: string, config: any): string;
    function _retrieveCredentialSecret(token: string): string;
  }
}
