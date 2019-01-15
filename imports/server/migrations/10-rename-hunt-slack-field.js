import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/hunts';

Migrations.add({
  version: 10,
  name: 'Rename hunt field slackChannel to firehoseSlackChannel',
  up() {
    Hunts.find({
      firehoseSlackChannel: null,
      slackChannel: { $ne: null },
    }).forEach((hunt) => {
      Hunts.update(hunt._id, {
        $set: { firehoseSlackChannel: hunt.slackChannel },
        $unset: { slackChannel: 1 },
      }, {
        validate: false,
      });
    });
  },
});
