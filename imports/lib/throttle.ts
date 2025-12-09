type AnyVoidFunc<T> = (this: T, ...args: any[]) => void;
type ThrottledFunctionHandle<T> = {
  attempt: AnyVoidFunc<T>;
  cancel: () => void;
};

export default function throttle<T>(
  func: AnyVoidFunc<T>,
  waitMsec: number,
): ThrottledFunctionHandle<T> {
  let timeoutHandle: number | undefined;
  let lastCalled = 0; // The last time we actually called `func`
  let savedThis: any; // the value of `this` as passed to func
  let savedArgs: any;

  const onTimeout = function () {
    timeoutHandle = undefined;
    lastCalled = Date.now();
    func.apply(savedThis, savedArgs);
    if (timeoutHandle !== undefined) {
      savedThis = undefined;
      savedArgs = undefined;
    }
  };

  const throttled = function (this: T, ...args: any[]) {
    const now = Date.now();
    const remaining = waitMsec - (now - lastCalled);
    if (remaining <= 0 || remaining > waitMsec) {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      lastCalled = now;
      func.apply(this, args);
      if (timeoutHandle !== undefined) {
        savedThis = undefined;
        savedArgs = undefined;
      }
    } else if (timeoutHandle === undefined) {
      savedThis = this;
      savedArgs = args;
      timeoutHandle = setTimeout(onTimeout, remaining) as any as number;
    }
  };

  const cancel = function () {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    timeoutHandle = undefined;
    lastCalled = 0;
    savedThis = undefined;
    savedArgs = undefined;
  };

  const handle = {
    attempt: throttled,
    cancel,
  };

  return handle;
}
