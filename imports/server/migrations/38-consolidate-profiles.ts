import { Mongo } from 'meteor/mongo';
import { Migrations } from 'meteor/percolate:migrations';
import * as t from 'io-ts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { UserCodec } from '../../lib/schemas/User';

// Since the profiles model has been removed, we need to make our own collection
// for this migration.
const Profiles = new Mongo.Collection<
  { _id: string } &
  Pick<t.TypeOf<typeof UserCodec>,
    'displayName' |
    'googleAccount' |
    'discordAccount' |
    'phoneNumber' |
    'muteApplause' |
    'dingwords'
  >
>('jr_profiles');

Migrations.add({
  version: 38,
  name: 'Consolidate profiles onto MeteorUsers',
  up() {
    MeteorUsers.find({ profile: { $ne: null as any } }).forEach((u) => {
      MeteorUsers.update(u._id, { $unset: { profile: 1 } }, { validate: false } as any);
    });

    Profiles.find({}).forEach((profile) => {
      const {
        displayName,
        googleAccount,
        discordAccount,
        phoneNumber,
        muteApplause,
        dingwords,
      } = profile;
      MeteorUsers.update(profile._id, {
        $set: {
          profile: {
            displayName,
            googleAccount,
            discordAccount,
            phoneNumber,
            muteApplause,
            dingwords,
          },
        },
      }, {
        validate: false,
        clean: false,
      } as any);
    });

    // Add indexes to match the old profiles model
    MeteorUsers._ensureIndex({ 'profile.displayName': 1 });
    MeteorUsers._ensureIndex({ _id: 1, 'profile.displayName': 1 });
    MeteorUsers._ensureIndex({ _id: 1, 'profile.dingwords': 1 });
  },
});
