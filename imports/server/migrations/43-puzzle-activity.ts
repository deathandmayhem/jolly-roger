import ConsolidatedActivities from '../models/ConsolidatedActivities';
import RecentActivities from '../models/RecentActivities';
import Migrations from './Migrations';

Migrations.add({
  version: 43,
  name: 'Indexes for puzzle activity tracking',
  async up() {
    await RecentActivities.createIndexAsync({
      ts: 1,
      type: 1,
      puzzle: 1,
      user: 1,
    }, { unique: true });
    await ConsolidatedActivities.createIndexAsync({
      ts: 1,
      puzzle: 1,
    }, { unique: true });
  },
});
