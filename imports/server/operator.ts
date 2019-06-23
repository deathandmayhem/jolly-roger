import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';

Meteor.methods({
  // Temporarily de-op yourself
  stopOperating() {
    if (!this.userId) throw new Meteor.Error(401, 'Unauthorized');
    Roles.checkPermission(this.userId, 'users.makeOperator');

    Roles.addUserToRoles(this.userId, 'inactiveOperator');
    Roles.removeUserFromRoles(this.userId, 'operator');
  },

  makeOperator(targetUserId: string) {
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
