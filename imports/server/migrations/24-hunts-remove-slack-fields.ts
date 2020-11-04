import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/hunts';

Migrations.add({
  version: 24,
  name: 'Remove Slack-related fields from Hunts',
  up() {
    Hunts.find({
      $or: [
        { firehoseSlackChannel: { $exists: true } },
        { puzzleHooksSlackChannel: { $exists: true } },
      ],
    }).forEach((h: any) => {
      Hunts.update(h._id, {
        $unset: {
          firehoseSlackChannel: '',
          puzzleHooksSlackChannel: '',
        },
      }, <any>{
        validate: false,
        getAutoValues: false,
      });
    });
  },
});
