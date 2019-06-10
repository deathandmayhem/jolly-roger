import { Migrations } from 'meteor/percolate:migrations';
import Servers from '../models/servers';

Migrations.add({
  version: 8,
  name: 'Add index for subscriptions server tracker',
  up() {
    Servers._ensureIndex({ updatedAt: 1 });
  },
});
