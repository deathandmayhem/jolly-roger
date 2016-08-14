import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '/imports/ansible.js';

Meteor.methods({
  makeOperator(targetUserId) {
    check(targetUserId, String);
    if (!Roles.userHasRole(this.userId, 'admin')) {
      throw new Meteor.Error(403, 'Non-operators may not grant operator permissions.');
    }

    Ansible.log('Promoting user to operator', { user: targetUserId, promoter: this.userId });
    Meteor.users.update({
      _id: targetUserId,
    }, {
      $addToSet: {
        roles: 'admin',
      },
    });
  },
});
