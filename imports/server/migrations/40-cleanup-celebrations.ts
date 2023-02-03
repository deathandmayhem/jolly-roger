import FeatureFlags from '../../lib/models/FeatureFlags';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Migrations from './Migrations';

Migrations.add({
  version: 40,
  name: 'Remove old configuration from celebrations',
  async up() {
    await FeatureFlags.removeAsync({ name: 'disable.applause' });
    for await (const u of MeteorUsers.find({ muteApplause: { $exists: true } })) {
      await MeteorUsers.updateAsync(u._id, {
        $unset: { muteApplause: 1 },
      });
    }
  },
});
