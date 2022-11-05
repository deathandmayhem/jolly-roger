import { Meteor } from 'meteor/meteor';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Migrations from './Migrations';
import dropIndex from './dropIndex';

type LegacyProfile = Pick<Meteor.User, 'displayName' | 'googleAccount' | 'discordAccount' | 'phoneNumber' | 'dingwords'>;

Migrations.add({
  version: 39,
  name: 'Promote profile fields to user top-level',
  async up() {
    MeteorUsers.find({ profile: { $ne: null as any } }).forEach((u) => {
      const {
        displayName, googleAccount, discordAccount, phoneNumber, dingwords,
      } = u.profile as LegacyProfile;
      MeteorUsers.update(u._id, {
        $set: {
          displayName,
          googleAccount,
          discordAccount,
          phoneNumber,
          dingwords,
        },
      });
      MeteorUsers.update(u._id, {
        $unset: { profile: 1 },
      }, {
        validate: false, clean: false,
      } as any);
    });

    // Fix indexes
    MeteorUsers.createIndex({ displayName: 1 });
    MeteorUsers.createIndex({ _id: 1, displayName: 1 });
    MeteorUsers.createIndex({ _id: 1, dingwords: 1 });
    await dropIndex(MeteorUsers, 'profile.displayName_1');
    await dropIndex(MeteorUsers, '_id_1_profile.displayName_1');
    await dropIndex(MeteorUsers, '_id_1_profile.dingwords_1');
  },
});
