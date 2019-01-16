import { Migrations } from 'meteor/percolate:migrations';
import Profiles from '../../lib/models/profiles';

Migrations.add({
  version: 9,
  name: 'Remove deprecated profile fields',
  up() {
    Profiles.update(
      {},
      { $unset: { locationDuringHunt: 1, remote: 1, affiliation: 1 } },
      { multi: true, validate: false },
    );
  },
});
