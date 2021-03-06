import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/hunts';

Migrations.add({
  version: 10,
  name: 'Rename hunt field slackChannel to firehoseSlackChannel',
  up() {
    Hunts.find(<any>{
      firehoseSlackChannel: null,
      slackChannel: { $ne: null },
    }).forEach((hunt) => {
      Hunts.update(hunt._id, {
        $set: { firehoseSlackChannel: (<any>hunt).slackChannel },
        $unset: { slackChannel: 1 },
      }, <any>{
        validate: false,
      });
    });
  },
});
