import ChatNotifications from '../../lib/models/ChatNotifications';
import Migrations from './Migrations';

Migrations.add({
  version: 32,
  name: 'Add indexes on ChatNotifications',
  up() {
    // Ensure that the query pattern in chat-notifications.ts is indexed.
    ChatNotifications._ensureIndex({ deleted: 1, user: 1 });
  },
});
