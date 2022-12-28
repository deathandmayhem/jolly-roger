import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { GLOBAL_SCOPE } from '../lib/is-admin';
import MeteorUsers from '../lib/models/MeteorUsers';
import { userMaySeeUserInfoForHunt } from '../lib/permission_stubs';
import { ProfileFields } from '../lib/schemas/User';
import SwappableCursorPublisher from './SwappableCursorPublisher';

const profileFields: Record<ProfileFields, 1> = {
  displayName: 1,
  googleAccount: 1,
  discordAccount: 1,
  phoneNumber: 1,
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

const republishOnUserChange = (
  sub: Subscription,
  projection: Mongo.FieldSpecifier,
  makeCursor: (user: Meteor.User) => Mongo.Cursor<Meteor.User> | undefined,
  makeTransform?: undefined |
    ((user: Meteor.User) => undefined | ((u: Partial<Meteor.User>) => Partial<Meteor.User>)),
) => {
  const u = (await MeteorUsers.findOneAsync(sub.userId!))!;
  const publish = new SwappableCursorPublisher(sub, MeteorUsers);
  publish.swap(makeCursor(u), makeTransform?.(u));
  const watch = MeteorUsers.find(sub.userId!, { fields: projection }).observe({
    changed: (doc) => {
      publish.swap(makeCursor(doc), makeTransform?.(doc));
    },
  });

  sub.onStop(() => {
    watch.stop();
    publish.stop();
  });
  sub.ready();
};

const makeHuntFilterTransform = (hunts: string[] = []):
  (user: Partial<Meteor.User>) => Partial<Meteor.User> => {
  const huntSet = new Set(hunts);
  return (u) => {
    return {
      ...u,
      hunts: u.hunts?.filter((h) => huntSet.has(h)),
    };
  };
};

Meteor.publish('displayNames', function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  republishOnUserChange(this, { hunts: 1 }, (u) => {
    if (!u.hunts?.includes(huntId)) {
      return undefined;
    }

    return MeteorUsers.find({ hunts: huntId }, { fields: { displayName: 1 } });
  });

  return undefined;
});

Meteor.publish('avatars', function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  republishOnUserChange(this, { hunts: 1 }, (u) => {
    if (!u.hunts?.includes(huntId)) {
      return undefined;
    }

    return MeteorUsers.find({ hunts: huntId }, { fields: { discordAccount: 1 } });
  });

  return undefined;
});

Meteor.publish('allProfiles', function () {
  if (!this.userId) {
    return [];
  }

  republishOnUserChange(this, { hunts: 1 }, (u) => {
    return MeteorUsers.find({ hunts: { $in: u.hunts ?? [] } }, {
      fields: {
        'emails.address': 1,
        hunts: 1,
        ...profileFields,
      },
    });
  }, (u) => makeHuntFilterTransform(u.hunts));

  return undefined;
});

Meteor.publish('huntProfiles', function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  republishOnUserChange(this, { hunts: 1 }, (u) => {
    if (!u.hunts?.includes(huntId)) {
      return undefined;
    }

    return MeteorUsers.find({ hunts: huntId }, {
      fields: {
        'emails.address': 1,
        hunts: 1,
        ...profileFields,
      },
    });
  }, (u) => makeHuntFilterTransform(u.hunts));

  return undefined;
});

Meteor.publish('profile', function (userId: unknown) {
  check(userId, String);

  if (!this.userId) {
    return [];
  }

  republishOnUserChange(this, { hunts: 1 }, (u) => {
    // Profiles are public if you have any hunts in common
    return MeteorUsers.find({ _id: userId, hunts: { $in: u.hunts ?? [] } }, {
      fields: {
        'emails.address': 1,
        hunts: 1,
        ...profileFields,
      },
    });
  }, (u) => makeHuntFilterTransform(u.hunts));

  return undefined;
});

Meteor.publish('huntRoles', function (huntId: unknown) {
  check(huntId, String);

  republishOnUserChange(this, { hunts: 1, roles: 1 }, () => {
    // Only publish other users' roles to admins and other operators.
    if (!userMaySeeUserInfoForHunt(this.userId, huntId)) {
      return undefined;
    }

    return MeteorUsers.find({ hunts: huntId }, {
      fields: {
        // Specifying sub-fields here is allowed, but will conflict with any other
        // concurrent publications for the same top-level field (roles). This
        // should be fine so long as we don't try to subscribe to huntRoles for
        // multiple hunts simultaneously.
        [`roles.${GLOBAL_SCOPE}`]: 1,
        [`roles.${huntId}`]: 1,
      },
    });
  });
});
