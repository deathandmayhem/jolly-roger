import { Migrations } from 'meteor/percolate:migrations';
import PendingAnnouncements from '../../lib/models/pending_announcements.js';

Migrations.add({
  version: 5,
  name: 'Create indexes for pending announcements',
  up() {
    PendingAnnouncements._ensureIndex({ user: 1 });
  },
});
