import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import { userMayConfigureTeamName } from '../../lib/permission_stubs';
import { optional } from '../../methods/TypedMethod';
import configureTeamName from '../../methods/configureTeamName';

configureTeamName.define({
  validate(arg) {
    check(arg, {
      teamName: optional(String),
    });
    return arg;
  },

  async run({ teamName }) {
    check(this.userId, String);
    if (!userMayConfigureTeamName(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, 'Must be admin to configure team name');
    }

    if (teamName) {
      await Settings.upsertAsync({ name: 'teamname' }, {
        $set: {
          value: {
            teamName,
          },
        },
      });
    } else {
      await Settings.removeAsync({ name: 'teamname' });
    }
  },
});
