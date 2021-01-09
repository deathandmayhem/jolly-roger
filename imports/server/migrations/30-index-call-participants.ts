import { Migrations } from 'meteor/percolate:migrations';
import CallParticipants from '../../lib/models/call_participants';

Migrations.add({
  version: 30,
  name: 'Add indexes on CallParticipants',
  up() {
    // The `call.metadata` publish queries by { hunt, call }.
    // The `call.join` publish does a point query for { hunt, call, tab, createdBy }.
    CallParticipants._ensureIndex({
      deleted: 1, hunt: 1, call: 1, tab: 1, createdBy: 1,
    });

    // Garbage collection queries by server.
    CallParticipants._ensureIndex({ deleted: 1, server: 1 });
  },
});
