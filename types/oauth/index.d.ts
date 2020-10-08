declare module 'meteor/oauth' {
  export module OAuth {
    function _redirectUri(service: string, config: any): string;
    function _retrieveCredentialSecret(token: string): string;
  }
}
