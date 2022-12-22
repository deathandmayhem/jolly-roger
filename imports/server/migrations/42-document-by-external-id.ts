import Documents from '../../lib/models/Documents';
import Migrations from './Migrations';

Migrations.add({
  version: 42,
  name: 'Index for finding documents by external id',
  async up() {
    await Documents.createIndexAsync({ 'value.id': 1 });
  },
});
