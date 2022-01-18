import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import {
  deprecatedUserMayMakeOperator,
  addUserToRole,
} from '../lib/permission_stubs';

Meteor.methods({
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
  },
});
