import { Migrations } from 'meteor/percolate:migrations';
import Profiles from '../../lib/models/profiles';

Migrations.add({
  version: 14,
  name: 'Add correct indexes for viewing profiles by display name',
  up() {
    Profiles._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
