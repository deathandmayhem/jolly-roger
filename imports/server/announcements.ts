import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import Announcements from '../lib/models/announcements';
import MeteorUsers from '../lib/models/meteor_users';
import PendingAnnouncements from '../lib/models/pending_announcements';

Meteor.methods({
  postAnnouncement(huntId: unknown, message: unknown) {
    check(this.userId, String);
    check(huntId, String);
    check(message, String);

    Roles.checkPermission(this.userId, 'mongo.announcements.insert');

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
