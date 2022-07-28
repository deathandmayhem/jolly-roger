import { Meteor } from 'meteor/meteor';
import Flags from '../Flags';
import ChatNotifications from '../lib/models/ChatNotifications';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Puzzles from '../lib/models/Puzzles';
import JoinPublisher from './JoinPublisher';

Meteor.publish('chatNotifications', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  if (Flags.active('disable.dingwords')) {
    return;
  }

  const watcher = new JoinPublisher(this, {
    model: ChatNotifications,
    foreignKeys: [{
      field: 'hunt',
      join: { model: Hunts },
    }, {
      field: 'puzzle',
      join: { model: Puzzles },
    }, {
      field: 'sender',
      join: {
        model: MeteorUsers,
        projection: { displayName: 1 },
      },
    }],
  }, { user: this.userId });
  this.onStop(() => watcher.shutdown());
});
