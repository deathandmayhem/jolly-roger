import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 19,
  name: 'Create new index for subscribers.fetch subscription',
  up() {
    await Subscribers.createIndexAsync({ name: 1 });
  },
});
