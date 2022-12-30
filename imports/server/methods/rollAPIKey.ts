import { check, Match } from 'meteor/check';
import Ansible from '../../Ansible';
import fetchAPIKey from '../../methods/fetchAPIKey';
import rollAPIKey from '../../methods/rollAPIKey';
import APIKeys from '../models/APIKeys';
import userForKeyOperation from '../userForKeyOperation';

rollAPIKey.define({
  validate(arg) {
    check(arg, { forUser: Match.Optional(String) });

    return arg;
  },

  async run({ forUser }) {
    check(this.userId, String);

    const user = await userForKeyOperation(this.userId, forUser);

    for await (const k of APIKeys.find({ user })) {
      Ansible.log('Expiring API key', { id: k._id, user: k.user, requestedBy: this.userId });
      await APIKeys.destroyAsync(k._id);
    }

    return fetchAPIKey.execute(this, { forUser });
  },
});
