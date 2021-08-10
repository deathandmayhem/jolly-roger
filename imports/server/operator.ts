import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import { deprecatedUserMayMakeOperator } from '../lib/permission_stubs';

Meteor.methods({
  // Temporarily de-op yourself
  stopOperating() {
    check(this.userId, String);
    if (!deprecatedUserMayMakeOperator(this.userId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to stop operating');
    }

    Roles.addUserToRoles(this.userId, 'inactiveOperator');
    Roles.removeUserFromRoles(this.userId, 'operator');
  },

  makeOperator(targetUserId: unknown) {
    check(this.userId, String);
    check(targetUserId, String);

    if (!deprecatedUserMayMakeOperator(this.userId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to make operator');
    }

    if (this.userId !== targetUserId) {
      Ansible.log('Promoting user to operator', { user: targetUserId, promoter: this.userId });
    }

    Roles.addUserToRoles(targetUserId, 'operator');
    // This may be a noop
    Roles.removeUserFromRoles(targetUserId, 'inactiveOperator');
  },
});
