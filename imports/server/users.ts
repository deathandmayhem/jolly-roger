import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { userIdIsAdmin } from '../lib/is-admin';
import MeteorUsers from '../lib/models/MeteorUsers';
import { userMaySeeUserInfoForHunt } from '../lib/permission_stubs';
import { ProfileFields } from '../lib/schemas/User';

const profileFields: Record<ProfileFields, 1> = {
  displayName: 1,
  googleAccount: 1,
  discordAccount: 1,
  phoneNumber: 1,
  muteApplause: 1,
  dingwords: 1,
};

// This overrides the default set of fields that are published to the
// `Meteor.user()` object for the logged-in user.
Accounts.setDefaultPublishFields({
  username: 1,
  emails: 1,
  roles: 1,
  hunts: 1,
  ...profileFields,
});

Meteor.publish('huntMembers', function (huntId: string) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  const u = MeteorUsers.findOne(this.userId)!;
  // Note: this is not reactive, so if hunt membership changes, this
  // will not recompute
  if (!u.hunts?.includes(huntId)) {
    return [];
  }

  return MeteorUsers.find({ hunts: huntId }, { fields: { hunts: 1 } });
});

Meteor.publish('displayNames', function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  const u = MeteorUsers.findOne(this.userId)!;
  // Note: this is not reactive, so if hunt membership changes, this
  // will not recompute
  if (!u.hunts?.includes(huntId)) {
    return [];
  }

  return MeteorUsers.find({ hunts: huntId }, { fields: { displayName: 1 } });
});

Meteor.publish('avatars', function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  const u = MeteorUsers.findOne(this.userId)!;
  // Note: this is not reactive, so if hunt membership changes, this
  // will not recompute
  if (!u.hunts?.includes(huntId)) {
    return [];
  }

  return MeteorUsers.find({}, { fields: { discordAccount: 1 } });
});

Meteor.publish('profiles', function () {
  if (!this.userId) {
    return [];
  }

  return MeteorUsers.find({}, {
    fields: {
      'emails.address': 1,
      ...profileFields,
    },
  });
});

Meteor.publish('profile', function (userId: string) {
  check(userId, String);

  if (!this.userId) {
    return [];
  }

  // For now, all user profiles are public, including email address
  return MeteorUsers.find(userId, {
    fields: {
      'emails.address': 1,
      ...profileFields,
    },
  });
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
