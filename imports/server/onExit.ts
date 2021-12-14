const exitHandlers: (() => void)[] = [];

['SIGINT' as const, 'SIGTERM' as const, 'SIGHUP' as const].forEach((signal) => {
  process.once(signal, () => {
    exitHandlers.splice(0).forEach((handler) => handler());
    process.kill(process.pid, signal);
  });
});

export default function onExit(handler: () => void) {
  exitHandlers.push(handler);
}
