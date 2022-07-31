import FeatureFlags from '../../lib/models/FeatureFlags';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Migrations from './Migrations';

Migrations.add({
  version: 40,
  name: 'Remove old configuration from celebrations',
  up() {
    FeatureFlags.remove({ name: 'disable.applause' });
    MeteorUsers.find({ muteApplause: { $exists: true } }).forEach((u) => {
      MeteorUsers.update(u._id, {
        $unset: { muteApplause: 1 },
      }, {
        validate: false, clean: false,
      } as any);
    });
  },
});
