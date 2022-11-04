import { promisify } from 'util';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import Hunts from '../../imports/lib/models/Hunts';
import MeteorUsers from '../../imports/lib/models/MeteorUsers';
import { addUserToRole as serverAddUserToRole, userIsOperatorForAnyHunt } from '../../imports/lib/permission_stubs';
import TypedMethod from '../../imports/methods/TypedMethod';
import { resetDatabase, stabilize } from './lib';

// To make these tests easier to setup, use these methods to punch through most
// of our normal permissions. They don't even require that you be logged in.
const createUser = new TypedMethod<{ email: string, password: string, displayName: string }, string>('test.methods.profiles.createUser');
const addUserToRole = new TypedMethod<{ userId: string, scope: string, role: string }, void>('test.methods.profiles.addUserToRole');
const createHunt = new TypedMethod<{ name: string }, string>('test.methods.profiles.createHunt');
const joinHunt = new TypedMethod<{ huntId: string, userId: string }, void>('test.methods.profiles.joinHunt');

const subscribeAsync = (name: string, ...args: any[]) => new Promise<Meteor.SubscriptionHandle>(
  (resolve, reject) => {
    const handle = Meteor.subscribe(name, ...args, {
      onStop: (reason?: Meteor.Error) => {
        if (reason) {
          reject(reason);
        }
      },
      onReady: () => {
        resolve(handle);
      },
    });
  }
);

if (Meteor.isServer) {
  createUser.define({
    validate(arg: unknown) {
      check(arg, {
        email: String,
        password: String,
        displayName: String,
      });

      return arg;
    },

    run({ email, password, displayName }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      const userId = Accounts.createUser({ email, password });
      MeteorUsers.update(userId, { $set: { displayName } });
      return userId;
    },
  });

  addUserToRole.define({
    validate(arg: unknown) {
      check(arg, {
        userId: String,
        scope: String,
        role: String,
      });

      return arg;
    },

    run({ userId, scope, role }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      serverAddUserToRole(userId, scope, role);
    },
  });

  createHunt.define({
    validate(arg: unknown) {
      check(arg, {
        name: String,
      });

      return arg;
    },

    run({ name }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      // Just pick a random creator
      const u = Meteor.users.findOne();
      if (!u) {
        throw new Meteor.Error(500, 'No users found');
      }

      return Hunts.insert({ name, hasGuessQueue: true, createdBy: u._id });
    },
  });

  joinHunt.define({
    validate(arg: unknown) {
      check(arg, {
        huntId: String,
        userId: String,
      });

      return arg;
    },

    run({ huntId, userId }) {
      MeteorUsers.update(userId, { $addToSet: { hunts: { $each: [huntId] } } });
    },
  });
}

if (Meteor.isClient) {
  describe('user profile publishes', function () {
    describe('displayNames', function () {
      it('behaves correctly', async function () {
        await resetDatabase('user profile publishes displayNames');

        const userId: string = await createUser.callPromise({ email: 'jolly-roger@deathandmayhem.com', password: 'password', displayName: 'U1' });
        const sameHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+same-hunt@deathandmayhem.com', password: 'password', displayName: 'U2' });
        const differentHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+different-hunt@deathandmayhem.com', password: 'password', displayName: 'U3' });

        const huntId: string = await createHunt.callPromise({ name: 'Test Hunt' });
        const otherHuntId: string = await createHunt.callPromise({ name: 'Other Hunt' });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId: differentHuntUserId });

        await promisify(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');

        let huntSub = await subscribeAsync('displayNames', huntId);

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1', 'U2'],
          'Should only show users in the same hunt'
        );

        huntSub.stop();
        await stabilize();
        huntSub = await subscribeAsync('displayNames', otherHuntId);

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1'],
          'Should not show users in the other hunt when not a member'
        );

        await joinHunt.callPromise({ huntId: otherHuntId, userId });

        assert.sameMembers(
          MeteorUsers.find({}, { fields: { displayName: 1 } }).map((u) => u.displayName),
          ['U1', 'U3'],
          'Should update when hunt membership changes'
        );
      });
    });

    describe('allProfiles', function () {
      it('behaves correctly', async function () {
        await resetDatabase('user profile publishes allProfiles');

        const userId: string = await createUser.callPromise({ email: 'jolly-roger@deathandmayhem.com', password: 'password', displayName: 'U1' });
        const sameHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+same-hunt@deathandmayhem.com', password: 'password', displayName: 'U2' });
        const differentHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+different-hunt@deathandmayhem.com', password: 'password', displayName: 'U3' });

        const huntId: string = await createHunt.callPromise({ name: 'Test Hunt' });
        const otherHuntId: string = await createHunt.callPromise({ name: 'Other Hunt' });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId: sameHuntUserId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId: differentHuntUserId });

        await promisify(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');

        await subscribeAsync('allProfiles');

        let u3 = MeteorUsers.findOne(differentHuntUserId);
        assert.isUndefined(u3, 'Should not show users in the other hunt when not a member');

        let u2 = MeteorUsers.findOne(sameHuntUserId);
        assert.isDefined(u2, 'Should show users in the same hunt');
        assert.sameMembers(u2!.hunts!, [huntId], 'Should not show membership in other hunts even if user is visible');

        await joinHunt.callPromise({ huntId: otherHuntId, userId });

        u2 = MeteorUsers.findOne(sameHuntUserId);
        assert.sameMembers(u2!.hunts!, [huntId, otherHuntId], 'Should update when hunt membership changes');
        u3 = MeteorUsers.findOne(differentHuntUserId);
        assert.isDefined(u3, 'Should show users in the other hunt when a member');
      });
    });

    describe('huntRoles', function () {
      it('behaves correctly', async function () {
        await resetDatabase('user profile publishes huntRoles');

        const userId: string = await createUser.callPromise({ email: 'jolly-roger@deathandmayhem.com', password: 'password', displayName: 'U1' });
        const sameHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+same-hunt@deathandmayhem.com', password: 'password', displayName: 'U2' });
        const differentHuntUserId: string = await createUser.callPromise({ email: 'jolly-roger+different-hunt@deathandmayhem.com', password: 'password', displayName: 'U3' });

        const huntId: string = await createHunt.callPromise({ name: 'Test Hunt' });
        const otherHuntId: string = await createHunt.callPromise({ name: 'Other Hunt' });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId: differentHuntUserId });

        await addUserToRole.callPromise({ userId, scope: huntId, role: 'operator' });
        await addUserToRole.callPromise({ userId: sameHuntUserId, scope: huntId, role: 'operator' });
        await addUserToRole.callPromise({ userId: differentHuntUserId, scope: otherHuntId, role: 'operator' });

        await promisify(Meteor.loginWithPassword)('jolly-roger@deathandmayhem.com', 'password');
        await subscribeAsync('huntRoles', huntId);
        await subscribeAsync('huntRoles', otherHuntId);

        let operators = MeteorUsers.find().map((u) => u._id).filter(userIsOperatorForAnyHunt);
        assert.sameMembers(operators, [userId, sameHuntUserId], 'Should only show operators in hunt where you are an operator');

        await addUserToRole.callPromise({ userId, scope: otherHuntId, role: 'operator' });
        operators = MeteorUsers.find().map((u) => u._id).filter(userIsOperatorForAnyHunt);
        assert.sameMembers(operators, [userId, sameHuntUserId, differentHuntUserId], 'Should update when hunt roles changes');
      });
    });
  });
}
