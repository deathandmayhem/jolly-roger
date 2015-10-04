const logfmt = Npm.require('logfmt');
const logLevels = new Set(['log', 'info', 'error', 'warn']);

Meteor.methods({
  // ansible just lets clients generate log messages on the server,
  // rather than having them lost into the distributed ether.
  //
  // Log lines are output using `logfmt` to make parsing and analysis
  // easier.
  ansible(level, line, obj) {
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

    const log = console[level];
    if (obj) {
      log("[%s] %s: %s", this.userId, line, logfmt.stringify(obj));
    } else {
      log("[%s] %s", this.userId, line);
    }
  }
});
