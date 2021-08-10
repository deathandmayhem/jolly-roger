import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import {
  deprecatedUserMayMakeOperator,
  addUserToRole,
  removeUserFromRole,
} from '../lib/permission_stubs';

Meteor.methods({
  // Temporarily de-op yourself
  stopOperating() {
    check(this.userId, String);
    if (!deprecatedUserMayMakeOperator(this.userId)) {
      throw new Meteor.Error(401, 'Must be operator or inactive operator to stop operating');
    }

    addUserToRole(this.userId, 'inactiveOperator');
    removeUserFromRole(this.userId, 'operator');
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

    addUserToRole(targetUserId, 'operator');
    // This may be a noop
    removeUserFromRole(targetUserId, 'inactiveOperator');
  },
});
