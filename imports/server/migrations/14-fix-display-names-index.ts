import { Migrations } from 'meteor/percolate:migrations';
import DocumentPermissions from '../../lib/models/document_permissions';
import Profiles from '../../lib/models/profiles';
import dropIndex from './drop-index';

Migrations.add({
  version: 14,
  name: 'Add correct indexes for viewing profiles by display name',
  up() {
    dropIndex(DocumentPermissions, 'deleted_1__id_1_displayName_1');

    Profiles._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
