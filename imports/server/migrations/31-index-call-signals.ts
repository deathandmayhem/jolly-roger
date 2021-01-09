import { Migrations } from 'meteor/percolate:migrations';
import CallSignals from '../../lib/models/call_signals';

Migrations.add({
  version: 31,
  name: 'Add indexes on CallSignals',
  up() {
    // `call.signal` publish makes a query by target.
    CallSignals._ensureIndex({ deleted: 1, target: 1 });

    // Various other methods do queries which can match by sender, or by
    // target, or exact match on both.
    //
    // The below index with Mongo's index prefixes, combined with the above
    // index and Mongo's index intersection should hasten all of our access
    // patterns.
    CallSignals._ensureIndex({ deleted: 1, sender: 1, target: 1 });
  },
});
