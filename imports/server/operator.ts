import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import MeteorUsers from '../lib/models/meteor_users';
import {
  addUserToRole,
  removeUserFromRole,
  userMayMakeOperatorForHunt,
} from '../lib/permission_stubs';

Meteor.methods({
  makeOperatorForHunt(targetUserId: unknown, huntId: string) {
    check(this.userId, String);
    check(targetUserId, String);
    check(huntId, String);

    if (!userMayMakeOperatorForHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to make operator');
    }

    const targetUser = MeteorUsers.findOne(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    if (this.userId !== targetUserId) {
      Ansible.log('Promoting user to operator', { user: targetUserId, promoter: this.userId });
    }

    addUserToRole(targetUserId, huntId, 'operator');
  },

  demoteOperatorForHunt(targetUserId: unknown, huntId: string) {
    check(this.userId, String);
    check(targetUserId, String);
    check(huntId, String);

    if (!userMayMakeOperatorForHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to demote operator');
    }

    const targetUser = MeteorUsers.findOne(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    if (this.userId === targetUserId) {
      throw new Meteor.Error(400, 'Cannot demote yourself');
    }

    Ansible.log('Demoting user from operator', { user: targetUserId, demoter: this.userId });
    removeUserFromRole(targetUserId, huntId, 'operator');
  },
});
