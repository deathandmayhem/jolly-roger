import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import MeteorUsers from '../lib/models/MeteorUsers';
import Settings from '../lib/models/Settings';
import UploadTokens from './models/UploadTokens';

// Clean up upload tokens that didn't get used within a minute
function cleanupUploadTokens() {
  const oldestValidTime = new Date(Date.now() - 60 * 1000);
  UploadTokens.remove({ createdAt: { $lt: oldestValidTime } });
}
function periodic() {
  Meteor.setTimeout(periodic, 15000 + (15000 * Random.fraction()));
  cleanupUploadTokens();
}
Meteor.startup(() => periodic());

Meteor.publish('hasUsers', function () {
  // Publish a pseudo-collection which just communicates if there are any users
  // at all, so we can either guide users through the server setup flow or just
  // point them at the login page.
  const cursor = MeteorUsers.find();
  if (cursor.count() > 0) {
    this.added('hasUsers', 'hasUsers', { hasUsers: true });
  } else {
    let handle: Meteor.LiveQueryHandle | undefined = cursor.observeChanges({
      added: (_id) => {
        this.added('hasUsers', 'hasUsers', { hasUsers: true });
        if (handle) {
          handle.stop();
        }
        handle = undefined;
      },
    });
    this.onStop(() => {
      if (handle) {
        handle.stop();
      }
    });
  }

  this.ready();
});

Meteor.publish('teamName', function () {
  const cursor = Settings.find({ name: 'teamname' });
  let tracked = false;
  const handle: Meteor.LiveQueryHandle = cursor.observe({
    added: (doc) => {
      if (doc.name === 'teamname' && doc.value && doc.value.teamName) {
        tracked = true;
        this.added('teamName', 'teamName', { name: doc.value.teamName });
      }
    },
    changed: (newDoc) => {
      if (newDoc.name === 'teamname' && newDoc.value.teamName) {
        this.changed('teamName', 'teamName', { name: newDoc.value.teamName });
      }
    },
    removed: () => {
      if (tracked) {
        this.removed('teamName', 'teamName');
      }
    },
  });
  this.onStop(() => {
    handle.stop();
  });

  this.ready();
});
