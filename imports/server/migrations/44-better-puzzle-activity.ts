import ChatMessages from '../../lib/models/ChatMessages';
import CallActivities from '../models/CallActivities';
import Migrations from './Migrations';

Migrations.add({
  version: 44,
  name: 'Indexes for puzzle activity tracking',
  async up() {
    await CallActivities.createIndexAsync({
      ts: 1,
      call: 1,
      user: 1,
    }, { unique: true });
    await CallActivities.createIndexAsync({
      hunt: 1,
      ts: 1,
    });

    await ChatMessages.createIndexAsync({
      hunt: 1,
      createdAt: 1,
    });
  },
});
