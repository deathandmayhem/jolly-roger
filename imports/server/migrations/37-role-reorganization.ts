import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
import { addUserToRole, removeUserFromRole } from '../../lib/permission_stubs';

Migrations.add({
  version: 37,
  name: 'Reorganize roles and eliminate inactiveOperator',
  up() {
    Meteor.users.find({ roles: 'inactiveOperator' }).forEach((user) => {
      addUserToRole(user._id, 'operator');
      removeUserFromRole(user._id, 'inactiveOperator');
    });
  },
});
