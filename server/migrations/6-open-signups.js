import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 6,
  name: 'Backfill new open signups property on hunts',
  up() {
    Models.Hunts.update(
      { openSignups: null },
      { $set: { openSignups: false } },
      { multi: true },
    );
  },
});
