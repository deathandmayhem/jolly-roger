import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Announcements from '../lib/models/Announcements';
import MeteorUsers from '../lib/models/MeteorUsers';
import PendingAnnouncements from '../lib/models/PendingAnnouncements';
import JoinPublisher from './JoinPublisher';

Meteor.methods({
  dismissPendingAnnouncement(pendingAnnouncementId: unknown) {
    check(this.userId, String);
    check(pendingAnnouncementId, String);

    PendingAnnouncements.remove({
      _id: pendingAnnouncementId,
      user: this.userId,
    });
  },
});

Meteor.publish('pendingAnnouncements', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  const watcher = new JoinPublisher(this, {
    model: PendingAnnouncements,
    foreignKeys: [{
      field: 'announcement',
      join: {
        model: Announcements,
        foreignKeys: [{
          field: 'createdBy',
          join: {
            model: MeteorUsers,
            projection: { displayName: 1 },
          },
        }],
      },
    }],
  }, { user: this.userId });
  this.onStop(() => watcher.shutdown());
});
