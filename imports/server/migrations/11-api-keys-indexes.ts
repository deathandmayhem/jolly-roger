import APIKeys from '../models/APIKeys';
import Migrations from './Migrations';

Migrations.add({
  version: 11,
  name: 'Add indexes for API keys',
  up() {
    APIKeys._ensureIndex({ key: 1 });
  },
});
