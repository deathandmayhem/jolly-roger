import { Migrations } from 'meteor/percolate:migrations';
import Subscribers from '../models/Subscribers';

Migrations.add({
  version: 19,
  name: 'Create new index for subscribers.fetch subscription',
  up() {
    Subscribers._ensureIndex({ name: 1 });
  },
});
