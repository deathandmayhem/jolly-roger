import CallHistories from '../../lib/models/mediasoup/CallHistories';
import Migrations from './Migrations';

Migrations.add({
  version: 36,
  name: 'Add indexes to CallHistory collection',
  async up() {
    await CallHistories.createIndexAsync({ call: 1 }, { unique: true });
    await CallHistories.createIndexAsync({ hunt: 1 });
  },
});
