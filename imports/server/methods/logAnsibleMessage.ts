import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import logfmt from 'logfmt';
import { optional } from '../../methods/TypedMethod';
import logAnsibleMessage, { logLevels } from '../../methods/logAnsibleMessage';

logAnsibleMessage.define({
  validate(arg) {
    check(arg, {
      level: Match.OneOf(...logLevels),
      line: String,
      obj: optional(Object),
    });
    return arg;
  },

  run({ level, line, obj }) {
    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(403, 'Server logging is only allowed for logged in users');
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
