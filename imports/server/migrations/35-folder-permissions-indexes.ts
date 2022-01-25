import { Migrations } from 'meteor/percolate:migrations';
import { _ } from 'meteor/underscore';
import FolderPermissions from '../../lib/models/FolderPermissions';

Migrations.add({
  version: 35,
  name: 'Indexes for new FolderPermissions model',
  up() {
    FolderPermissions._ensureIndex(
      { folder: 1, user: 1, googleAccount: 1 },
      { unique: true },
    );
  },
});
