import CallHistories from '../../lib/models/mediasoup/CallHistories';
import Migrations from './Migrations';

Migrations.add({
  version: 36,
  name: 'Add indexes to CallHistory collection',
  up() {
    CallHistories.createIndex({ call: 1 }, { unique: true });
    CallHistories.createIndex({ hunt: 1 });
  },
});
