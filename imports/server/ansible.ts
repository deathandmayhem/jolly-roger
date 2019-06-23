import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import * as logfmt from 'logfmt';

const logLevels = new Set(['log', 'info', 'error', 'warn']);

Meteor.methods({
  // ansible just lets clients generate log messages on the server,
  // rather than having them lost into the distributed ether.
  //
  // Log lines are output using `logfmt` to make parsing and analysis
  // easier.
  ansible(level: 'log' | 'info' | 'error' | 'warn', line: string, obj: object) {
    check(level, String);
    check(line, String);
    check(obj, Match.Optional(Object));

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(403, 'Server logging is only allowed for logged in users');
    }

    if (!logLevels.has(level)) {
      throw new Meteor.Error(400, 'Invalid log level');
    }

    let msg = '';

    if (this.userId) {
      msg += `[${this.userId}] `;
    }

    msg += line;

    if (obj) {
      msg += `: ${logfmt.stringify(obj)}`;
    }

    // eslint-disable-next-line no-console
    console[level]('%s', msg);
  },
});
