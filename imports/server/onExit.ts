const exitHandlers: (() => void | Promise<void>)[] = [];

['SIGINT' as const, 'SIGTERM' as const, 'SIGHUP' as const].forEach((signal) => {
  process.once(signal, () => {
    void (async () => {
      await exitHandlers.splice(0).reduce(async (p, handler) => {
        await p;
        await handler();
      }, Promise.resolve());
      process.kill(process.pid, signal);
    })();
  });
});

export default function onExit(handler: () => void | Promise<void>) {
  exitHandlers.push(handler);
}
