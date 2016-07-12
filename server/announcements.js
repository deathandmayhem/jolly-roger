import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '/imports/ansible.js';

Meteor.methods({
  postAnnouncement(huntId, message) {
    check(this.userId, String);
    check(huntId, String);
    check(message, String);

    Roles.checkPermission(this.userId, 'mongo.announcements.insert');

    Ansible.log('Creating an announcement', {user: this.userId, hunt: huntId, message});
    const id = Models.Announcements.insert({
      hunt: huntId,
      message: message,
    });

    Meteor.users.find({hunts: huntId}).forEach((user) => {
      Models.PendingAnnouncements.insert({
        hunt: huntId,
        announcement: id,
        user: user._id,
      });
    });
  },
});
