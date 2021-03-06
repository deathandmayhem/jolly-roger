import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Mustache from 'mustache';
import Ansible from '../ansible';
import Hunts from '../lib/models/hunts';
import Profiles from '../lib/models/profiles';
import Settings from '../lib/models/settings';
import { HuntType } from '../lib/schemas/hunts';
import { SettingType } from '../lib/schemas/settings';
import addUserToDiscordRole from './addUserToDiscordRole';
import List from './blanche';

const DEFAULT_EXISTING_JOIN_SUBJECT = '[jolly-roger] Added to {{huntName}} on {{siteName}}';

function renderExistingJoinEmailSubject(setting: SettingType | undefined, hunt: HuntType) {
  const view = {
    siteName: Accounts.emailTemplates.siteName,
    huntName: hunt.name,
  };

  if (setting && setting.name === 'email.branding') {
    if (setting.value.existingJoinMessageSubjectTemplate) {
      return Mustache.render(setting.value.existingJoinMessageSubjectTemplate, view);
    }
  }

  return Mustache.render(DEFAULT_EXISTING_JOIN_SUBJECT, view);
}

const DEFAULT_EXISTING_JOIN_TEMPLATE = 'Hiya!\n' +
    '\n' +
    'You\'ve been added to to a new hunt on Death and Mayhem\'s virtual headquarters ' +
    '{{siteName}}{{#joinerName}} by {{joinerName}}{{/joinerName}}, so that you can join' +
    'us for the MIT Mystery Hunt.\n' +
    '\n' +
    'You\'ve been added to this hunt: {{huntName}}\n' +
    '\n' +
    '{{#mailingListsCount}}' +
    'You\'ve also been put onto a handful of mailing lists for communications ' +
    'about these and future hunts:\n' +
    '\n' +
    '{{mailingListsCommaSeparated}}\n' +
    '\n' +
    '{{/mailingListsCount}}' +
    'Let us know if you run into any issues at dfa-web@mit.edu.\n' +
    '\n' +
    'Happy Puzzling,\n' +
    '- The Jolly Roger Web Team\n' +
    '\n' +
    'This message was sent to {{email}}';

function renderExistingJoinEmail(setting: SettingType | undefined, user: Meteor.User | null,
  hunt: HuntType, joinerName: string | null) {
  const email = user && user.emails && user.emails[0] && user.emails[0].address;
  const view = {
    siteName: Accounts.emailTemplates.siteName,
    joinerName,
    huntName: hunt.name,
    mailingListsCount: hunt.mailingLists.length,
    mailingListsCommaSeparated: hunt.mailingLists.join(', '),
    email,
  };

  if (setting && setting.name === 'email.branding') {
    if (setting.value.existingJoinMessageTemplate) {
      return Mustache.render(setting.value.existingJoinMessageTemplate, view);
    }
  }

  return Mustache.render(DEFAULT_EXISTING_JOIN_TEMPLATE, view);
}

Meteor.methods({
  addToHunt(huntId: unknown, email: unknown) {
    check(huntId, String);
    check(email, String);
    check(this.userId, String);

    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    Roles.checkPermission(this.userId, 'hunt.join', huntId);

    let joineeUser = <Meteor.User | undefined>Accounts.findUserByEmail(email);
    const newUser = joineeUser === undefined;
    if (!joineeUser) {
      const joineeUserId = Accounts.createUser({ email });
      joineeUser = Meteor.users.findOne(joineeUserId)!;
    }
    if (!joineeUser._id) throw new Meteor.Error(500, 'Something has gone terribly wrong');

    if (joineeUser.hunts.includes(huntId)) {
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
    Meteor.users.update(joineeUser._id, { $addToSet: { hunts: { $each: [huntId] } } });
    const joineeEmails = (joineeUser.emails || []).map((e) => e.address);

    hunt.mailingLists.forEach((listName) => {
      const list = new List(listName);
      joineeEmails.forEach((joineeEmail) => {
        if (!list.add(joineeEmail)) {
          Ansible.log('Unable to add user to list', { joineeEmail, list: listName });
        }
      });
    });

    addUserToDiscordRole(joineeUser._id, huntId);

    if (newUser) {
      Accounts.sendEnrollmentEmail(joineeUser._id);
      Ansible.info('Sent invitation email to new user', { invitedBy: this.userId, email });
    } else if (joineeUser._id !== this.userId) {
      const joinerProfile = Profiles.findOne(this.userId);
      const joinerName = joinerProfile && joinerProfile.displayName !== '' ?
        joinerProfile.displayName :
        null;
      const settingsDoc = Settings.findOne({ name: 'email.branding' });
      const subject = renderExistingJoinEmailSubject(settingsDoc, hunt);
      const text = renderExistingJoinEmail(settingsDoc, joineeUser, hunt, joinerName);
      Email.send({
        from: Accounts.emailTemplates.from,
        to: email,
        subject,
        text,
      });
    }
  },

  bulkAddToHunt(huntId: unknown, emails: unknown) {
    check(huntId, String);
    check(emails, [String]);
    check(this.userId, String);

    Roles.checkPermission(this.userId, 'hunt.bulkJoin', huntId);

    // We'll re-do this check but if we check it now the error reporting will be
    // better
    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    const errors: { email: string, error: Meteor.Error }[] = [];
    emails.forEach((email) => {
      try {
        Meteor.call('addToHunt', huntId, email);
      } catch (error) {
        errors.push({ email, error });
      }
    });

    if (errors.length > 0) {
      const message = errors.map(({ email, error }) => {
        const err = (error as any).sanitizedError ?? error;
        return `${email}: ${err.reason}`;
      })
        .join('\n');
      throw new Meteor.Error(500, `Failed to send invites for some emails:\n${message}`);
    }
  },

  syncDiscordRole(huntId: unknown) {
    check(huntId, String);
    check(this.userId, String);

    Roles.checkPermission(this.userId, 'discord.useBotAPIs', huntId);

    Meteor.users.find({ hunts: huntId })
      .forEach((u) => {
        addUserToDiscordRole(u._id, huntId);
      });
  },
});
