import { Meteor } from 'meteor/meteor';

function performLog(level: 'log' | 'info' | 'error' | 'warn', line: string, obj?: object) {
  const args: any[] = [line];
  if (obj) {
    args.push(obj);
  }

  if (Meteor.isClient) {
    console[level](...args); // eslint-disable-line no-console
  }

  Meteor.call('ansible', level, ...args);
}

export default {
  log: performLog.bind(null, 'log'),
  info: performLog.bind(null, 'info'),
  error: performLog.bind(null, 'error'),
  warn: performLog.bind(null, 'warn'),
};
