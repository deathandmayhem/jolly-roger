import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Settings from '../../lib/models/Settings';
import { userMayConfigureTeamName } from '../../lib/permission_stubs';
import configureTeamName from '../../methods/configureTeamName';

configureTeamName.define({
  validate(arg) {
    check(arg, {
      teamName: Match.Optional(String),
    });
    return arg;
  },

  run({ teamName }) {
    check(this.userId, String);
    if (!userMayConfigureTeamName(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure team name');
    }

    if (teamName) {
      Settings.upsert({ name: 'teamname' }, {
        $set: {
          value: {
            teamName,
          },
        },
      });
    } else {
      Settings.remove({ name: 'teamname' });
    }
  },
});
