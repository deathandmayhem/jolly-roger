import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 3,
  name: 'Add indexes for subscriber tracking',
  async up() {
    await Subscribers.createIndexAsync({ server: 1 });
    await Subscribers.createIndexAsync({ name: 1 });
  },
});
