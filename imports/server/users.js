import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';

Meteor.publish('selfHuntMembership', function () {
  if (!this.userId) {
    return [];
  }

  return Meteor.users.find(this.userId, { fields: { hunts: 1 } });
});

Meteor.publish('huntMembers', function (huntId) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  const u = Meteor.users.findOne(this.userId);
  // Note: this is not reactive, so if hunt membership changes, this
  // behavior will change
  if (!_.contains(u.hunts, huntId)) {
    return [];
  }

  return Meteor.users.find({ hunts: huntId }, { fields: { hunts: 1 } });
});

Meteor.publish('userRoles', function (targetUserId) {
  check(targetUserId, String);

  // Only publish other users' roles to admins and other (potentially-inactive) operators.
  if (!Roles.userHasRole(this.userId, 'admin') && !Roles.userHasPermission(this.userId, 'users.makeOperator')) {
    return [];
  }

  return Meteor.users.find(targetUserId, { fields: { roles: 1 } });
});
