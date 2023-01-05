import isAdmin from '../../lib/isAdmin';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import settingsAll from '../../lib/publications/settingsAll';
import definePublication from './definePublication';

definePublication(settingsAll, {
  async run() {
    // Only allow admins to pull down Settings.
    if (!this.userId || !isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
      return [];
    }

    return Settings.find({});
  },
});
