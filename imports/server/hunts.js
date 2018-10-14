import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import Ansible from '/imports/ansible.js';
import { List } from '/imports/server/blanche.js';
import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';

const existingJoinEmail = (user, hunt, joinerName) => {
  const email = user && user.emails && user.emails[0] && user.emails[0].address;
  const huntExcerpt = 'You\'ve also been put onto a handful of mailing lists for communications ' +
    'about these and future hunts:\n' +
    '\n' +
    `${hunt.mailingLists.join(', ')}\n` +
    '\n';

  return 'Hiya!\n' +
    '\n' +
    'You\'ve been added to to a new hunt on Death and Mayhem\'s virtual headquarters ' +
    `${Accounts.emailTemplates.siteName}${joinerName ? ` by ${joinerName}` : ''}, so that you ` +
    'can join us for the MIT Mystery Hunt.\n' +
    '\n' +
    `You've been added to this hunt: ${hunt.name}\n` +
    '\n' +
    `${hunt.mailingLists.length !== 0 ? huntExcerpt : ''}` +
    'The site itself is under pretty active construction, so expect quite a few changes in the ' +
    'next few days, but let us know if you run into any major bugs at dfa-web@mit.edu.\n' +
    '\n' +
    'Happy Puzzling,\n' +
    '- The Jolly Roger Web Team\n' +
    '\n' +
    `This message was sent to ${email}`;
};

Meteor.methods({
  addToHunt(huntId, email) {
    check(huntId, String);
    check(email, String);

    const hunt = Models.Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    Roles.checkPermission(this.userId, 'hunt.join', huntId);

    let joineeUser = Accounts.findUserByEmail(email);
    const newUser = joineeUser === undefined;
    if (newUser) {
      const joineeUserId = Accounts.createUser({ email });
      joineeUser = Meteor.users.findOne(joineeUserId);
    }

    if (_.include(joineeUser.hunts, huntId)) {
      Ansible.log('Tried to add user to hunt but they were already a member', {
        joiner: this.userId,
        joinee: joineeUser._id,
        hunt: huntId,
      });
      return;
    }

    Ansible.log('Adding user to hunt', {
      joiner: this.userId,
      joinee: joineeUser._id,
      hunt: huntId,
    });
    Meteor.users.update(joineeUser._id, { $addToSet: { hunts: huntId } });
    const joineeEmails = _.chain(joineeUser.emails)
      .pluck('address')
      .value();

    _.each(hunt.mailingLists, (listName) => {
      const list = new List(listName);
      _.each(joineeEmails, (joineeEmail) => {
        if (!list.add(joineeEmail)) {
          Ansible.log('Unable to add user to list', { joineeEmail, list: listName });
        }
      });
    });

    if (newUser) {
      Accounts.sendEnrollmentEmail(joineeUser._id);
      Ansible.info('Sent invitation email to new user', { invitedBy: this.userId, email });
    } else if (joineeUser._id !== this.userId) {
      const joinerProfile = Models.Profiles.findOne(this.userId);
      const joinerName = joinerProfile && joinerProfile.displayName !== '' ?
        joinerProfile.displayName :
        null;
      Email.send({
        from: Accounts.emailTemplates.from,
        to: email,
        subject: `[jolly-roger] Added to ${hunt.name} on ${Accounts.emailTemplates.siteName}`,
        text: existingJoinEmail(joineeUser, hunt, joinerName),
      });
    }
  },
});
