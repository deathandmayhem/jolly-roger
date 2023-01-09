import { check, Match } from 'meteor/check';
import fetchAPIKey from '../../methods/fetchAPIKey';
import ensureAPIKey from '../ensureAPIKey';

fetchAPIKey.define({
  validate(arg) {
    check(arg, { forUser: Match.Optional(String) });

    return arg;
  },

  async run({ forUser }) {
    check(this.userId, String);

    return ensureAPIKey({ forUser, requestedBy: this.userId });
  },
});
