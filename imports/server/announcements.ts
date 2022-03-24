import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../Ansible';
import Announcements from '../lib/models/Announcements';
import MeteorUsers from '../lib/models/MeteorUsers';
import PendingAnnouncements from '../lib/models/PendingAnnouncements';
import { userMayAddAnnouncementToHunt } from '../lib/permission_stubs';
import JoinPublisher from './JoinPublisher';

Meteor.methods({
  postAnnouncement(huntId: unknown, message: unknown) {
    check(this.userId, String);
    check(huntId, String);
    check(message, String);

    if (!userMayAddAnnouncementToHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, `User ${this.userId} may not create annoucements for hunt ${huntId}`);
    }

    Ansible.log('Creating an announcement', { user: this.userId, hunt: huntId, message });
    const id = Announcements.insert({
      hunt: huntId,
      message,
    });

    MeteorUsers.find({ hunts: huntId }).forEach((user) => {
      PendingAnnouncements.insert({
        hunt: huntId,
        announcement: id,
        user: user._id,
      });
    });
  },

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
