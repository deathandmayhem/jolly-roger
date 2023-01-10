import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Logger from '../../Logger';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { checkAdmin } from '../../lib/permission_stubs';
import configureCollectGoogleAccountIds from '../../methods/configureCollectGoogleAccountIds';
import GoogleClient from '../googleClientRefresher';

configureCollectGoogleAccountIds.define({
  async run() {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const { people } = GoogleClient;
    if (!people) {
      throw new Meteor.Error(500, 'Google integration is disabled');
    }

    let pageToken: string | undefined;
    do {
      const resp = await people.otherContacts.list({
        pageToken,
        sources: ['READ_SOURCE_TYPE_CONTACT', 'READ_SOURCE_TYPE_PROFILE'],
        readMask: 'emailAddresses,metadata',
      });
      pageToken = resp.data.nextPageToken ?? undefined;

      await resp.data.otherContacts?.reduce(async (p, contact) => {
        await p;

        const id = contact.metadata?.sources?.find((s) => s.type === 'PROFILE')?.id ?? undefined;
        if (!id) {
          return;
        }

        const addresses = contact.emailAddresses?.reduce<string[]>((a, e) => {
          if (e.value) {
            a.push(e.value);
          }
          return a;
        }, []);

        Logger.info('Storing Google account IDs on users', { id, addresses });
        await MeteorUsers.updateAsync({
          googleAccountId: undefined,
          googleAccount: { $in: addresses },
        }, {
          $set: {
            googleAccountId: id,
          },
        }, { multi: true });
      }, Promise.resolve());
    } while (pageToken);
  },
});
