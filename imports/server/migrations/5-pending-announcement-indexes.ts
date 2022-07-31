import PendingAnnouncements from '../../lib/models/PendingAnnouncements';
import Migrations from './Migrations';

Migrations.add({
  version: 5,
  name: 'Create indexes for pending announcements',
  up() {
    PendingAnnouncements.createIndex({ user: 1 });
  },
});
