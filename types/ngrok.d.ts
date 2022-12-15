declare module 'ngrok' {
  namespace Ngrok {
    interface Tunnel {
      config: {
        addr: string;
        inspect: boolean;
      }
    }
  }
}
