import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import isAdmin, { GLOBAL_SCOPE } from "../lib/isAdmin";
import Hunts from "../lib/models/Hunts";
import MeteorUsers from "../lib/models/MeteorUsers";
import type { ProfileFields } from "../lib/models/User";
import { userMaySeeUserInfoForHunt } from "../lib/permission_stubs";
import type { SubSubscription } from "./PublicationMerger";
import PublicationMerger from "./PublicationMerger";
import publishCursor from "./publications/publishCursor";

const profileFields: Record<ProfileFields, 1> = {
  displayName: 1,
  googleAccount: 1,
  discordAccount: 1,
  phoneNumber: 1,
  dingwords: 1,
  dingwordsOpenMatch: 1,
};

// This overrides the default set of fields that are published to the
// `Meteor.user()` object for the logged-in user.
Accounts.setDefaultPublishFields({
  username: 1,
  emails: 1,
  roles: 1,
  hunts: 1,
  huntTermsAcceptedAt: 1,
  ...profileFields,
});

const republishOnUserChange = async (
  sub: Subscription,
  projection: Mongo.FieldSpecifier,
  makeCursor: (
    user: Meteor.User,
  ) =>
    | Mongo.Cursor<Meteor.User>
    | undefined
    | Promise<Mongo.Cursor<Meteor.User> | undefined>,
  makeTransform?:
    | undefined
    | ((
        user: Meteor.User,
      ) => undefined | ((u: Partial<Meteor.User>) => Partial<Meteor.User>)),
) => {
  const u = (await MeteorUsers.findOneAsync(sub.userId!))!;
  const merger = new PublicationMerger(sub);
  const cursor = await makeCursor(u);
  let currentSub: SubSubscription | undefined;
  if (cursor) {
    currentSub = merger.newSub();
    await publishCursor(
      currentSub,
      Meteor.users._name,
      cursor,
      makeTransform?.(u),
    );
  }
  const watch = await MeteorUsers.find(sub.userId!, {
    projection,
  }).observeAsync({
    changed: (doc) => {
      void (async () => {
        const newCursor = await makeCursor(doc);
        let newSub;
        if (newCursor) {
          newSub = merger.newSub();
          await publishCursor(
            newSub,
            Meteor.users._name,
            newCursor,
            makeTransform?.(doc),
          );
        }
        if (currentSub) {
          merger.removeSub(currentSub);
        }
        currentSub = newSub;
      })();
    },
  });

  sub.onStop(() => watch.stop());
  sub.ready();
};

const makeHuntFilterTransform = (
  hunts: string[] = [],
): ((user: Partial<Meteor.User>) => Partial<Meteor.User>) => {
  const huntSet = new Set(hunts);
  return (u) => {
    return {
      ...u,
      hunts: u.hunts?.filter((h) => huntSet.has(h)),
    };
  };
};

Meteor.publish("displayNames", async function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  await republishOnUserChange(this, { hunts: 1 }, (u) => {
    if (!u.hunts?.includes(huntId)) {
      return undefined;
    }

    return MeteorUsers.find(
      { hunts: huntId },
      { projection: { displayName: 1 } },
    );
  });

  return undefined;
});

Meteor.publish("avatars", async function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  await republishOnUserChange(this, { hunts: 1 }, (u) => {
    if (!u.hunts?.includes(huntId)) {
      return undefined;
    }

    return MeteorUsers.find(
      { hunts: huntId },
      { projection: { discordAccount: 1 } },
    );
  });

  return undefined;
});

Meteor.publish("allProfiles", async function () {
  if (!this.userId) {
    return [];
  }

  await republishOnUserChange(
    this,
    { hunts: 1 },
    (u) => {
      return MeteorUsers.find(
        { hunts: { $in: u.hunts ?? [] } },
        {
          projection: {
            "emails.address": 1,
            hunts: 1,
            ...profileFields,
          },
        },
      );
    },
    (u) => makeHuntFilterTransform(u.hunts),
  );

  return undefined;
});

Meteor.publish("huntProfiles", async function (huntId: unknown) {
  check(huntId, String);

  if (!this.userId) {
    return [];
  }

  await republishOnUserChange(
    this,
    { hunts: 1 },
    (u) => {
      if (!u.hunts?.includes(huntId)) {
        return undefined;
      }

      return MeteorUsers.find(
        { hunts: huntId },
        {
          projection: {
            "emails.address": 1,
            hunts: 1,
            ...profileFields,
          },
        },
      );
    },
    (u) => makeHuntFilterTransform(u.hunts),
  );

  return undefined;
});

Meteor.publish("profile", async function (userId: unknown) {
  check(userId, String);

  if (!this.userId) {
    return [];
  }

  await republishOnUserChange(
    this,
    { hunts: 1 },
    (u) => {
      // Profiles are public if you have any hunts in common
      return MeteorUsers.find(
        { _id: userId, hunts: { $in: u.hunts ?? [] } },
        {
          projection: {
            "emails.address": 1,
            hunts: 1,
            ...profileFields,
          },
        },
      );
    },
    (u) => makeHuntFilterTransform(u.hunts),
  );

  return undefined;
});

Meteor.publish("huntRoles", async function (huntId: unknown) {
  check(huntId, String);

  await republishOnUserChange(this, { hunts: 1, roles: 1 }, async (u) => {
    // Only publish other users' roles to admins and other operators.
    if (!userMaySeeUserInfoForHunt(u, await Hunts.findOneAsync(huntId))) {
      return undefined;
    }

    return MeteorUsers.find(
      { hunts: huntId },
      {
        projection: {
          // Specifying sub-fields here is allowed, but will conflict with any other
          // concurrent publications for the same top-level field (roles). This
          // should be fine so long as we don't try to subscribe to huntRoles for
          // multiple hunts simultaneously.
          [`roles.${GLOBAL_SCOPE}`]: 1,
          [`roles.${huntId}`]: 1,
        },
      },
    );
  });
});

Meteor.publish("invitedUsers", async function () {
  if (!this.userId) {
    return [];
  }

  if (!isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
    return [];
  }

  await republishOnUserChange(this, { "services.password.enroll": 1 }, (u) => {
    return MeteorUsers.find(
      { "services.password.enroll.reason": "enroll" },
      // Currently, because this is limited to admins only, we don't check that
      // the user has access to the hunt(s) that the invitation(s) were issued
      // for.
      // If this is ever enabled for non-admins, we will need to limit the
      // hunt(s) that invites are returned for.
      {
        fields: {
          "services.password.enroll.email": 1,
          "services.password.enroll.when": 1,
          hunts: 1,
          ...profileFields,
        },
      },
    );
  });

  return undefined;
});
