import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { userIdIsAdmin } from '../lib/is-admin';
import MeteorUsers from '../lib/models/meteor_users';
import { userMaySeeUserInfoForHunt } from '../lib/permission_stubs';

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
  if (!u.hunts?.includes(huntId)) {
    return [];
  }

  return MeteorUsers.find({ hunts: huntId }, { fields: { hunts: 1 } });
});

Meteor.publish('displayNames', function () {
  if (!this.userId) {
    return [];
  }

  return MeteorUsers.find({}, { fields: { 'profile.displayName': 1 } });
});

Meteor.publish('avatars', function () {
  if (!this.userId) {
    return [];
  }

  return MeteorUsers.find({}, { fields: { 'profile.discordAccount': 1 } });
});

Meteor.publish('profiles', function () {
  if (!this.userId) {
    return [];
  }

  // For now, all user profiles are public, including email address
  return MeteorUsers.find({}, { fields: { 'emails.address': 1, profile: 1 } });
});

Meteor.publish('huntUserInfo', function (huntId: string) {
  check(huntId, String);

  // Only publish other users' roles to admins and other operators.
  if (!userMaySeeUserInfoForHunt(this.userId, huntId)) {
    return [];
  }

  return MeteorUsers.find({ hunts: huntId }, { fields: { roles: 1, hunts: 1 } });
});

Meteor.publish('userInfo', function (targetUserId: string) {
  check(targetUserId, String);

  // Allow single-user info to be published if there is any hunt the target is a
  // member of for which the caller is an operator. Note that this is a
  // non-reactive computation
  const targetUser = MeteorUsers.findOne(targetUserId);
  const callerAllowed = userIdIsAdmin(this.userId) ||
    targetUser?.hunts?.some((huntId) => userMaySeeUserInfoForHunt(this.userId, huntId));
  if (!callerAllowed) {
    return [];
  }

  return MeteorUsers.find(targetUserId, { fields: { roles: 1, hunts: 1 } });
});
