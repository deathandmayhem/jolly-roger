import { Migrations } from 'meteor/percolate:migrations';
import APIKeys from '../models/APIKeys';

Migrations.add({
  version: 11,
  name: 'Add indexes for API keys',
  up() {
    APIKeys._ensureIndex({ key: 1 });
  },
});
