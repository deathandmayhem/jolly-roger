import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import Hunts from '../../imports/lib/models/Hunts';
import MeteorUsers from '../../imports/lib/models/MeteorUsers';
import { addUserToRole, userIsOperatorForAnyHunt } from '../../imports/lib/permission_stubs';
import { stabilize } from './lib';

if (Meteor.isServer) {
  // To make these tests easier to setup, use these methods to punch through
  // most of our normal permissions. They don't even require that you be logged
  // in.
  Meteor.methods({
    'test.profiles.createUser': function (email: unknown, password: unknown, displayName: unknown) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      check(email, String);
      check(password, String);
      check(displayName, String);

      const userId = Accounts.createUser({ email, password });
      MeteorUsers.update(userId, { $set: { displayName } });
      return userId;
    },

    'test.profiles.addUserToRole': function (userId: unknown, scope: unknown, role: unknown) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      check(userId, String);
      check(scope, String);
      check(role, String);

      addUserToRole(userId, scope, role);
    },

    'test.profiles.createHunt': function (name: unknown) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      check(name, String);

      // Just pick a random creator
      const u = Meteor.users.findOne();
      if (!u) {
        throw new Meteor.Error(500, 'No users found');
      }

      return Hunts.insert({ name, hasGuessQueue: true, createdBy: u._id });
    },

    'test.profiles.joinHunt': function (huntId: unknown, userId: unknown) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      check(huntId, String);
      check(userId, String);

      MeteorUsers.update(userId, { $addToSet: { hunts: { $each: [huntId] } } });
    },
  });
}

if (Meteor.isClient) {
  describe('user profile publishes', function () {
    describe('displayNames', function () {
      it('behaves correctly', async function () {
        await Meteor.callPromise('test.resetDatabase');

        const userId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger@deathandmayhem.com', 'password', 'U1');
        const sameHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+same-hunt@deathandmayhem.com', 'password', 'U2');
        const differentHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+different-hunt@deathandmayhem.com', 'password', 'U3');

        const huntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Test Hunt');
        const otherHuntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Other Hunt');

        await Meteor.callPromise('test.profiles.joinHunt', huntId, userId);
        await Meteor.callPromise('test.profiles.joinHunt', huntId, sameHuntUserId);
        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, differentHuntUserId);

        await Meteor.wrapPromise(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');

        let huntSub = Meteor.subscribe('displayNames', huntId);
        await huntSub.readyPromise();

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1', 'U2'],
          'Should only show users in the same hunt'
        );

        huntSub.stop();
        await stabilize();
        huntSub = Meteor.subscribe('displayNames', otherHuntId);
        await huntSub.readyPromise();

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1'],
          'Should not show users in the other hunt when not a member'
        );

        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, userId);

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1', 'U3'],
          'Should update when hunt membership changes'
        );
      });
    });

    describe('allProfiles', function () {
      it('behaves correctly', async function () {
        await Meteor.callPromise('test.resetDatabase');

        const userId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger@deathandmayhem.com', 'password', 'U1');
        const sameHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+same-hunt@deathandmayhem.com', 'password', 'U2');
        const differentHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+different-hunt@deathandmayhem.com', 'password', 'U3');

        const huntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Test Hunt');
        const otherHuntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Other Hunt');

        await Meteor.callPromise('test.profiles.joinHunt', huntId, userId);
        await Meteor.callPromise('test.profiles.joinHunt', huntId, sameHuntUserId);
        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, sameHuntUserId);
        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, differentHuntUserId);

        await Meteor.wrapPromise(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');

        await Meteor.subscribe('allProfiles').readyPromise();

        let u3 = MeteorUsers.findOne(differentHuntUserId);
        assert.isUndefined(u3, 'Should not show users in the other hunt when not a member');

        let u2 = MeteorUsers.findOne(sameHuntUserId);
        assert.isDefined(u2, 'Should show users in the same hunt');
        assert.sameMembers(u2!.hunts!, [huntId], 'Should not show membership in other hunts even if user is visible');

        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, userId);

        u2 = MeteorUsers.findOne(sameHuntUserId);
        assert.sameMembers(u2!.hunts!, [huntId, otherHuntId], 'Should update when hunt membership changes');
        u3 = MeteorUsers.findOne(differentHuntUserId);
        assert.isDefined(u3, 'Should show users in the other hunt when a member');
      });
    });

    describe('huntRoles', function () {
      it('behaves correctly', async function () {
        await Meteor.callPromise('test.resetDatabase');

        const userId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger@deathandmayhem.com', 'password', 'U1');
        const sameHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+same-hunt@deathandmayhem.com', 'password', 'U2');
        const differentHuntUserId: string = await Meteor.callPromise('test.profiles.createUser', 'jolly-roger+different-hunt@deathandmayhem.com', 'password', 'U3');

        const huntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Test Hunt');
        const otherHuntId: string = await Meteor.callPromise('test.profiles.createHunt', 'Other Hunt');

        await Meteor.callPromise('test.profiles.joinHunt', huntId, userId);
        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, userId);
        await Meteor.callPromise('test.profiles.joinHunt', huntId, sameHuntUserId);
        await Meteor.callPromise('test.profiles.joinHunt', otherHuntId, differentHuntUserId);

        await Meteor.callPromise('test.profiles.addUserToRole', userId, huntId, 'operator');
        await Meteor.callPromise('test.profiles.addUserToRole', sameHuntUserId, huntId, 'operator');
        await Meteor.callPromise('test.profiles.addUserToRole', differentHuntUserId, otherHuntId, 'operator');

        await Meteor.wrapPromise(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');
        await Meteor.subscribe('huntRoles', huntId).readyPromise();
        await Meteor.subscribe('huntRoles', otherHuntId).readyPromise();

        let operators = MeteorUsers.find().map((u) => u._id).filter(userIsOperatorForAnyHunt);
        assert.sameMembers(operators, [userId, sameHuntUserId], 'Should only show operators in hunt where you are an operator');

        await Meteor.callPromise('test.profiles.addUserToRole', userId, otherHuntId, 'operator');
        operators = MeteorUsers.find().map((u) => u._id).filter(userIsOperatorForAnyHunt);
        assert.sameMembers(operators, [userId, sameHuntUserId, differentHuntUserId], 'Should update when hunt roles changes');
      });
    });
  });
}
