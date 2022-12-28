import { Mongo } from 'meteor/mongo';
import * as t from 'io-ts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { UserCodec } from '../../lib/schemas/User';
import Migrations from './Migrations';

// Since the profiles model has been removed, we need to make our own collection
// for this migration.
const Profiles = new Mongo.Collection<
  { _id: string } &
  Pick<t.TypeOf<typeof UserCodec>,
    'displayName' |
    'googleAccount' |
    'discordAccount' |
    'phoneNumber' |
    'dingwords'
  >
>('jr_profiles');

Migrations.add({
  version: 38,
  name: 'Consolidate profiles onto MeteorUsers',
  async up() {
    MeteorUsers.find({ profile: { $ne: null as any } }).forEach((u) => {
      await MeteorUsers.updateAsync(u._id, { $unset: { profile: 1 } }, { validate: false } as any);
    });

    Profiles.find({}).forEach((profile) => {
      const {
        displayName,
        googleAccount,
        discordAccount,
        phoneNumber,
        dingwords,
      } = profile;
      await MeteorUsers.updateAsync(profile._id, {
        $set: {
          profile: {
            displayName,
            googleAccount,
            discordAccount,
            phoneNumber,
            dingwords,
          },
        },
      }, {
        validate: false,
        clean: false,
        filter: false,
      } as any);
    });

    // Add indexes to match the old profiles model
    await MeteorUsers.createIndexAsync({ 'profile.displayName': 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, 'profile.displayName': 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, 'profile.dingwords': 1 });
  },
});
