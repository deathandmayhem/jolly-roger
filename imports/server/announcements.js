import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '../ansible.js';
import Announcements from '../lib/models/announcements.js';
import PendingAnnouncements from '../lib/models/pending_announcements.js';

Meteor.methods({
  postAnnouncement(huntId, message) {
    check(this.userId, String);
    check(huntId, String);
    check(message, String);

    Roles.checkPermission(this.userId, 'mongo.announcements.insert');

    Ansible.log('Creating an announcement', { user: this.userId, hunt: huntId, message });
    const id = Announcements.insert({
      hunt: huntId,
      message,
    });

    Meteor.users.find({ hunts: huntId }).forEach((user) => {
      PendingAnnouncements.insert({
        hunt: huntId,
        announcement: id,
        user: user._id,
      });
    });
  },
});
