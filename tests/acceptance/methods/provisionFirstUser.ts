import { promisify } from 'util';
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import provisionFirstUser from '../../../imports/methods/provisionFirstUser';
import { resetDatabase, USER_EMAIL, USER_PASSWORD } from '../lib';

if (Meteor.isClient) {
  describe('provisionUser', function () {
    it('allows creating a user when there is none', async function () {
      await resetDatabase('provisionUser allows creating a user when there is none');

      await provisionFirstUser.callPromise({ email: USER_EMAIL, password: USER_PASSWORD });

      // We should be able to login now
      await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
    });

    it('does not allow creating a user when there is one already', async function () {
      // And if we logout and try to provision a user again, it should fail
      await promisify(Meteor.logout)();

      await assert.isRejected(provisionFirstUser.callPromise({ email: 'jolly-roger+new@deathandmayhem.com', password: USER_PASSWORD }));
    });
  });
}
