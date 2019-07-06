/* eslint-disable no-restricted-globals */

declare module 'meteor/ccorcos:subs-cache' {
  // eslint-disable-next-line import/prefer-default-export
  export const SubsCache: SubsCacheStatic;

  interface SubscriptionHandle {
    stop(): void;
    stopNow(): void;
    ready(): boolean;
    onReady(callback: () => void): void;
    restart(): void;
  }

  interface SubsCache {
    ready(): boolean;
    onReady(callback: () => void): void;
    clear(): void;
    subscribe(name: string, ...args: any[]): SubscriptionHandle;
    subscribeFor(expireTime: number, name: string, ...args: any[]): SubscriptionHandle;
  }

  interface SubsCacheStatic {
    new (expireAfter?: number, cacheLimit?: number, debug?: boolean): SubsCache;
    new (opts: {
      expireAfter?: number,
      cacheLimit?: number,
      debug?: boolean,
    }): SubsCache;
  }
}
