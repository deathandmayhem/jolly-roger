import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import MeteorUsers from '../lib/models/meteor_users';

Meteor.publish('selfHuntMembership', function () {
  if (!this.userId) {
    return [];
  }

  return MeteorUsers.find(this.userId, { fields: { hunts: 1 } });
});

Meteor.publish('huntMembers', function (huntId: string) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  const u = MeteorUsers.findOne(this.userId)!;
  // Note: this is not reactive, so if hunt membership changes, this
  // behavior will change
  if (!u.hunts.includes(huntId)) {
    return [];
  }

  return MeteorUsers.find({ hunts: huntId }, { fields: { hunts: 1 } });
});

Meteor.publish('userRoles', function (targetUserId: string) {
  check(targetUserId, String);

  // Only publish other users' roles to admins and other (potentially-inactive) operators.
  if (!Roles.userHasRole(this.userId, 'admin') && !Roles.userHasPermission(this.userId, 'users.makeOperator')) {
    return [];
  }

  return MeteorUsers.find(targetUserId, { fields: { roles: 1 } });
});
