import { Migrations } from 'meteor/percolate:migrations';
import Profiles from '../../lib/models/profiles';

Migrations.add({
  version: 22,
  name: 'Remove slackHandle from Profiles',
  up() {
    Profiles.find({ slackHandle: { $exists: true } }).forEach((p: any) => {
      if (p.slackHandle === undefined) return; // already migrated

      Profiles.update(p._id, {
        $unset: {
          slackHandle: '',
        },
      }, <any>{
        validate: false,
        getAutoValues: false,
      });
    });
  },
});
