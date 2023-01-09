import { Meteor } from 'meteor/meteor';

function performLog(level: 'log' | 'info' | 'error' | 'warn', line: string, obj?: object) {
  let msg = '';

  try {
    msg += `[${Meteor.userId()}] `;
  } catch {
    // ignore, probably not in a method/publication
  }

  msg += line;

  console[level](msg, ...obj ? [obj] : []); // eslint-disable-line no-console
}

export default {
  log: performLog.bind(null, 'log'),
  info: performLog.bind(null, 'info'),
  error: performLog.bind(null, 'error'),
  warn: performLog.bind(null, 'warn'),
};
