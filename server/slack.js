import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import Ansible from '/imports/ansible.js';

Meteor.methods({
  slackInvite(userId) {
    check(userId, Match.Optional(String));

    if (!this.userId && this.connection) {
      throw new Meteor.Error(403, 'Only logged in users can send slack invites');
    }

    if (!this.userId && !userId) {
      throw new Meteor.Error(400, 'Must pass user id for server calls');
    }

    const user = Meteor.users.findOne(userId || this.userId);
    if (!user) {
      throw new Meteor.Error(404, 'Can not find user');
    }

    const email = user && user.emails && user.emails[0] && user.emails[0].address;
    if (!email) {
      throw new Meteor.Error(400, 'User does not have an email address on file');
    }

    const config = ServiceConfiguration.configurations.findOne({ service: 'slack' });
    if (!config) {
      throw new Meteor.Error(500, 'Slack is not configured; unable to send invite');
    }

    this.unblock();

    Ansible.log('Sending a Slack invite', { email, user: user._id, sender: this.userId });

    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    const result = HTTP.post('https://slack.com/api/users.admin.invite', {
      params: {
        token: config.secret,
        email,
        set_active: true,
      },
    });

    if (result.statusCode >= 400) {
      Ansible.log('Error sending Slack invite', { content: result.content });
      throw new Meteor.Error(500, 'Something went wrong sending the invite');
    }
  },
});
