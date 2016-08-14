import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import Ansible from '/imports/ansible.js';
import { List } from '/imports/server/blanche.js';
import { huntFixtures } from '/imports/fixtures.js';

Meteor.methods({
  joinHunt(huntId) {
    check(huntId, String);

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(401, 'You are not logged in');
    }

    const hunt = huntFixtures[huntId] || Models.Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    Ansible.log('User joining hunt', { user: this.userId, hunt: huntId });
    Meteor.users.update(this.userId, { $addToSet: { hunts: huntId } });
    const user = Meteor.users.findOne(this.userId);
    const emails = _.chain(user.emails).
      pluck('address').
      value();

    _.each(hunt.mailingLists, (listName) => {
      const list = new List(listName);
      _.each(emails, (email) => {
        if (!list.add(email)) {
          Ansible.log('Unable to add user to list', { email, list: listName });
        }
      });
    });
  },
});
