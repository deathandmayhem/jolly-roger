import { Meteor } from 'meteor/meteor';
import logAnsibleMessage, { LogLevel } from './methods/logAnsibleMessage';

function performLog(level: LogLevel, line: string, obj?: object) {
  const args: any[] = [line];
  if (obj) {
    args.push(obj);
  }

  if (Meteor.isClient) {
    console[level](...args); // eslint-disable-line no-console
  }

  logAnsibleMessage.call({ level, line, obj });
}

export default {
  log: performLog.bind(null, 'log'),
  info: performLog.bind(null, 'info'),
  error: performLog.bind(null, 'error'),
  warn: performLog.bind(null, 'warn'),
};
