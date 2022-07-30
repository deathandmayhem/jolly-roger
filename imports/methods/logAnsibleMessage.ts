import TypedMethod from './TypedMethod';

export const logLevels = ['log' as const, 'info' as const, 'error' as const, 'warn' as const];
export type LogLevel = typeof logLevels[number];

// ansible just lets clients generate log messages on the server, rather than
// having them lost into the distributed ether.
//
// Log lines are output using `logfmt` to make parsing and analysis easier.
export default new TypedMethod<{
  level: LogLevel,
  line: string,
  obj?: object,
}, void>(
  'Ansible.methods.logMessage'
);
