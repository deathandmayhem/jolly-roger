declare module "meteor/oauth" {
  export module OAuth {
    function _loginStyle(service: string, config: any, options: any): string;
    function _redirectUri(service: string, config: any): string;
    function _retrieveCredentialSecret(token: string): string;
    function _stateParam(
      loginStyle: string,
      credentialToken: string,
      redirectUrl?: string,
    ): string;
    function launchLogin(options: any): void;
    function openSecret(serviceData: string, userId?: string): string;
    function registerService(
      name: string,
      version: number,
      urls: string[] | null,
      handleOauthRequest: (query: any) => any,
    ): void;
    function retrieveCredential(key: string, secret: string): any;
  }
}
