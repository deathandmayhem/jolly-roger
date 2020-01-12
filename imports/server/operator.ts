import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';

Meteor.methods({
  // Temporarily de-op yourself
  stopOperating() {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'users.makeOperator');

    Roles.addUserToRoles(this.userId, 'inactiveOperator');
    Roles.removeUserFromRoles(this.userId, 'operator');
  },

  makeOperator(targetUserId: unknown) {
    check(targetUserId, String);

    Roles.checkPermission(this.userId, 'users.makeOperator');

    if (this.userId !== targetUserId) {
      Ansible.log('Promoting user to operator', { user: targetUserId, promoter: this.userId });
    }

    Roles.addUserToRoles(targetUserId, 'operator');
    // This may be a noop
    Roles.removeUserFromRoles(targetUserId, 'inactiveOperator');
  },
});
