const exitHandlers: (() => void | Promise<void>)[] = [];

["SIGINT" as const, "SIGTERM" as const, "SIGHUP" as const].forEach((signal) => {
  process.once(signal, () => {
    void (async () => {
      for (const handler of exitHandlers.splice(0)) {
        await handler();
      }
      process.kill(process.pid, signal);
    })();
  });
});

export default function onExit(handler: () => void | Promise<void>) {
  exitHandlers.push(handler);
}
