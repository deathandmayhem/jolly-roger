// biome-ignore-all lint/suspicious/noConsole: migrated from eslint

// A dumb, mostly-oblivious trace buffer to enable getting some event ordering
// information out of production, hopefully  without generating terrible
// overhead or memory usage unless manually enabled by a user.

// Allow initial trace state to be set via localStorage, so we can
// enable recording traces on initial page load before a human can
// poke things in the console.
let TRACING_ENABLED = localStorage.getItem("enableTracing") !== null;

type TraceItem = {
  stamp: number;
  args: any;
};

const eventBuffer: TraceItem[] = [];
const trace = (...args: any[]) => {
  if (TRACING_ENABLED) {
    const now = performance.now();
    eventBuffer.push({
      stamp: now,
      args,
    });
    console.log(now, ...args);
  }
};

const replayEvents = () => {
  eventBuffer.forEach(({ stamp, args }) => {
    console.log(stamp, ...args);
  });
};

const begin = () => {
  TRACING_ENABLED = true;
};

const end = () => {
  TRACING_ENABLED = false;
};

const clear = () => {
  eventBuffer.splice(0, eventBuffer.length);
};

const dumpBuffer = () => {
  console.log(JSON.stringify(eventBuffer));
};

export { dumpBuffer, eventBuffer, replayEvents, begin, end, clear, trace };
