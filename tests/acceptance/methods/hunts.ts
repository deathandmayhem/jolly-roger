import { promisify } from 'util';
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import Hunts from '../../../imports/lib/models/Hunts';
import huntForHuntApp from '../../../imports/lib/publications/huntForHuntApp';
import { HuntPattern } from '../../../imports/lib/schemas/Hunt';
import createHunt from '../../../imports/methods/createHunt';
import destroyHunt from '../../../imports/methods/destroyHunt';
import provisionFirstUser from '../../../imports/methods/provisionFirstUser';
import undestroyHunt from '../../../imports/methods/undestroyHunt';
import updateHunt from '../../../imports/methods/updateHunt';
import { resetDatabase, USER_EMAIL, USER_PASSWORD } from '../lib';

if (Meteor.isClient) {
  const typedSubscribe: typeof import('../../../imports/client/typedSubscribe').default =
    require('../../../imports/client/typedSubscribe').default;

  describe('hunt methods', function () {
    let huntId: string;

    before(async function () {
      await resetDatabase('hunt tests');
      await provisionFirstUser.callPromise({ email: USER_EMAIL, password: USER_PASSWORD });
      await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
    });

    it('can create a hunt', async function () {
      huntId = await createHunt.callPromise({
        name: 'Test Hunt',
        hasGuessQueue: true,
        openSignups: false,
        mailingLists: [],
      });

      await typedSubscribe.async(huntForHuntApp, { huntId });

      const hunt = await Hunts.findOneAsync(huntId);
      assert.isOk(hunt);
    });

    it('can update all fields on a hunt', async function () {
      const updates = {
        name: 'Test Hunt 2',
        hasGuessQueue: false,
        mailingLists: ['death-and-mayhem'],
        signupMessage: 'Email the operator',
        openSignups: true,
        homepageUrl: 'https://puzzles.mit.edu/2018/',
        submitTemplate: '{{{origin}}}{{{pathname}}}',
        puzzleHooksDiscordChannel: { id: '123', name: 'hunt-channel' },
        firehoseDiscordChannel: { id: '456', name: 'firehose-role' },
        memberDiscordRole: { id: '789', name: 'member-role' },
      };

      await updateHunt.callPromise({ huntId, value: updates });

      await typedSubscribe.async(huntForHuntApp, { huntId });

      const hunt = (await Hunts.findOneAsync(huntId))!;
      assert.isOk(hunt);
      for (const key of Object.keys(updates)) {
        assert.deepEqual(hunt[key as keyof typeof hunt], updates[key as keyof typeof updates], `hunt.${key} did not match`);
      }
    });

    it('can unset all optional fields on a hunt', async function () {
      const updates = {
        name: 'Test Hunt 3',
        hasGuessQueue: true,
        openSignups: false,
        mailingLists: [],
      };

      await updateHunt.callPromise({ huntId, value: updates });

      await typedSubscribe.async(huntForHuntApp, { huntId });

      const hunt = (await Hunts.findOneAsync(huntId))!;
      assert.isOk(hunt);

      for (const key of Object.keys(HuntPattern)) {
        if (key in updates) {
          continue;
        }
        assert.isUndefined(hunt[key as keyof typeof hunt], `hunt.${key} was not undefined`);
      }
    });

    it('can be destroyed', async function () {
      await destroyHunt.callPromise({ huntId });

      await typedSubscribe.async(huntForHuntApp, { huntId });

      const hunt = await Hunts.findOneAllowingDeletedAsync(huntId);
      assert.isOk(hunt);

      assert.isTrue(hunt?.deleted);
    });

    it('can be undestroyed', async function () {
      await undestroyHunt.callPromise({ huntId });

      await typedSubscribe.async(huntForHuntApp, { huntId });

      const hunt = await Hunts.findOneAllowingDeletedAsync(huntId);
      assert.isOk(hunt);

      assert.isFalse(hunt?.deleted);
    });
  });
}
