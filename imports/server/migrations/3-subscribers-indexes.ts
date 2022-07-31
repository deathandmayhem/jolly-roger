import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 3,
  name: 'Add indexes for subscriber tracking',
  up() {
    Subscribers.createIndex({ server: 1 });
    Subscribers.createIndex({ name: 1 });
  },
});
