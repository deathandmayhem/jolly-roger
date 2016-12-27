import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 10,
  name: "Rename hunt field slackChannel to firehoseSlackChannel",
  up() {
    Models.Hunts.find({
      firehoseSlackChannel: null,
      slackChannel: { $ne: null },
    }).forEach((hunt) => {
      Models.Hunts.update(hunt._id, {
        $set: { firehoseSlackChannel: hunt.slackChannel },
        $unset: { slackChannel: 1 },
      }, {
        validate: false,
      });
    });
  },
});
