declare module 'meteor/promise' {
  interface PromiseConstructor extends globalThis.PromiseConstructor {
    /* await takes a promise, blocks on it being fulfilled, then returns the
       result */
    await<T>(promise: PromiseLike<T>): T;

    /* awaitAll takes a list of promises, blocks on all of them being fulfilled,
       then returns a list of results */
    awaitAll<T>(values: readonly (T | PromiseLike<T>)[]): T[];
    awaitAll<T1, T2>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>
    ]): [T1, T2];
    awaitAll<T1, T2, T3>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>
    ]): [T1, T2, T3];
    awaitAll<T1, T2, T3, T4>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>
    ]): [T1, T2, T3, T4];
    awaitAll<T1, T2, T3, T4, T5>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>
    ]): [T1, T2, T3, T4, T5];
    awaitAll<T1, T2, T3, T4, T5, T6>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>,
      T6 | PromiseLike<T6>
    ]): [T1, T2, T3, T4, T5, T6];
    awaitAll<T1, T2, T3, T4, T5, T6, T7>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>,
      T6 | PromiseLike<T6>,
      T7 | PromiseLike<T7>
    ]): [T1, T2, T3, T4, T5, T6, T7];
    awaitAll<T1, T2, T3, T4, T5, T6, T7, T8>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>,
      T6 | PromiseLike<T6>,
      T7 | PromiseLike<T7>,
      T8 | PromiseLike<T8>
    ]): [T1, T2, T3, T4, T5, T6, T7, T8];
    awaitAll<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>,
      T6 | PromiseLike<T6>,
      T7 | PromiseLike<T7>,
      T8 | PromiseLike<T8>,
      T9 | PromiseLike<T9>
    ]): [T1, T2, T3, T4, T5, T6, T7, T8, T9];
    awaitAll<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(values: readonly [
      T1 | PromiseLike<T1>,
      T2 | PromiseLike<T2>,
      T3 | PromiseLike<T3>,
      T4 | PromiseLike <T4>,
      T5 | PromiseLike<T5>,
      T6 | PromiseLike<T6>,
      T7 | PromiseLike<T7>,
      T8 | PromiseLike<T8>,
      T9 | PromiseLike<T9>,
      T10 | PromiseLike<T10>
    ]): [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10];

    /* async takes a blocking function, and returns a function which accepts the
       same arguments but returns a promise instead of blocking on a value */
    async<T extends (...args: any[]) => any>(fn: T):
      (...args: Parameters<T>) => Promise<ReturnType<T>>;

    /* asyncApply takes a blocking function and a list of arguments and calls
       the function with those arguments, but returns a promise instead of
       blocking on a return value */
    asyncApply<T extends (...args: any[]) => any>(
      fn: T,
      context: any,
      args: Parameters<T>,
      allowReuseOfCurrentFiber?: boolean
    ): Promise<ReturnType<T>>;
  }

  interface Promise<T> extends globalThis.Promise<T> {
    /* await blocks until this is fulfilled, then returns the result */
    await(): T;
  }

  export const Promise: PromiseConstructor;
}
