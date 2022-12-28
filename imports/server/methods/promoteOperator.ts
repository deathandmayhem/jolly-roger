import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { addUserToRole, userMayMakeOperatorForHunt } from '../../lib/permission_stubs';
import promoteOperator from '../../methods/promoteOperator';

promoteOperator.define({
  validate(arg) {
    check(arg, {
      targetUserId: String,
      huntId: String,
    });
    return arg;
  },

  async run({ targetUserId, huntId }) {
    check(this.userId, String);

    if (!userMayMakeOperatorForHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to make operator');
    }

    const targetUser = await MeteorUsers.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    if (this.userId !== targetUserId) {
      Ansible.log('Promoting user to operator', { user: targetUserId, promoter: this.userId });
    }

    addUserToRole(targetUserId, huntId, 'operator');
  },
});
