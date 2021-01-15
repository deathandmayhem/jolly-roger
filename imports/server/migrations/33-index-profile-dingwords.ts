import { Migrations } from 'meteor/percolate:migrations';
import Profiles from '../../lib/models/profiles';

Migrations.add({
  version: 33,
  name: 'Add dingword index to Profiles',
  up() {
    // Ensure that the query pattern used in dingword-hooks.ts is indexed.
    Profiles._ensureIndex({ deleted: 1, _id: 1, dingwords: 1 });
  },
});
