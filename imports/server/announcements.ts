import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import Announcements from '../lib/models/announcements';
import PendingAnnouncements from '../lib/models/pending_announcements';
import Profiles from '../lib/models/profiles';

Meteor.publish('announcements.pending', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Unauthenticated');
  }

  const pas = PendingAnnouncements.find({ user: this.userId });
  const announcementIds = [...new Set(pas.map(pa => pa.announcement))];
  const announcements = Announcements.find({ _id: { $in: announcementIds } });

  const creatorIds = [...new Set(announcements.map(a => a.createdBy))];
  const creators = Profiles.find({ _id: { $in: creatorIds } }, { fields: { displayName: 1 } });

  return [pas, announcements, creators];
});
Meteor.publish('announcements.all', function (huntId: string) {
  check(huntId, String);
  const u = Meteor.users.findOne(this.userId);
  if (!u) {
    throw new Meteor.Error(401, 'Unauthenticated');
  }

  if (!u.hunts.includes(huntId)) {
    throw new Meteor.Error(403, 'Not a member of that hunt');
  }

  const announcements = Announcements.find({ hunt: huntId });

  const creatorIds = [...new Set(announcements.map(a => a.createdBy))];
  const creators = Profiles.find({ _id: { $in: creatorIds } }, { fields: { displayName: 1 } });

  return [announcements, creators];
});

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
