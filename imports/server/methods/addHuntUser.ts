import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import Mustache from 'mustache';
import Ansible from '../../Ansible';
import Flags from '../../Flags';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import { userMayAddUsersToHunt } from '../../lib/permission_stubs';
import { HuntType } from '../../lib/schemas/Hunt';
import addHuntUser from '../../methods/addHuntUser';
import List from '../List';
import addUsersToDiscordRole from '../addUsersToDiscordRole';
import { ensureHuntFolderPermission } from '../gdrive';

const DEFAULT_EXISTING_JOIN_SUBJECT = '[jolly-roger] Added to {{huntName}} on {{siteName}}';

function renderExistingJoinEmailSubject(template: string | undefined, hunt: HuntType) {
  const view = {
    siteName: Accounts.emailTemplates.siteName,
    huntName: hunt.name,
  };

  if (template) {
    return Mustache.render(template, view);
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

function renderExistingJoinEmail(
  template: string | undefined,
  user: Meteor.User | null,
  hunt: HuntType,
  joinerName: string | undefined
) {
  const email = user?.emails?.[0]?.address;
  const view = {
    siteName: Accounts.emailTemplates.siteName,
    joinerName,
    huntName: hunt.name,
    mailingListsCount: hunt.mailingLists.length,
    mailingListsCommaSeparated: hunt.mailingLists.join(', '),
    email,
  };

  if (template) {
    return Mustache.render(template, view);
  }

  return Mustache.render(DEFAULT_EXISTING_JOIN_TEMPLATE, view);
}

addHuntUser.define({
  validate(arg) {
    check(arg, {
      huntId: String,
      email: String,
    });
    return arg;
  },

  async run({ huntId, email }) {
    check(this.userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    if (!userMayAddUsersToHunt(await MeteorUsers.findOneAsync(this.userId), hunt)) {
      throw new Meteor.Error(401, `User ${this.userId} may not add members to ${huntId}`);
    }

    let joineeUser = Accounts.findUserByEmail(email);
    const newUser = joineeUser === undefined;
    if (!joineeUser) {
      const joineeUserId = Accounts.createUser({ email });
      joineeUser = await MeteorUsers.findOneAsync(joineeUserId);
    }
    if (!joineeUser?._id) throw new Meteor.Error(500, 'Something has gone terribly wrong');

    if (joineeUser.hunts?.includes(huntId)) {
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
    await MeteorUsers.updateAsync(joineeUser._id, { $addToSet: { hunts: { $each: [huntId] } } });
    const joineeEmails = (joineeUser.emails ?? []).map((e) => e.address);

    hunt.mailingLists.forEach((listName) => {
      const list = new List(listName);
      joineeEmails.forEach((joineeEmail) => {
        if (!list.add(joineeEmail)) {
          Ansible.log('Unable to add user to list', { joineeEmail, list: listName });
        }
      });
    });

    await addUsersToDiscordRole([joineeUser._id], huntId);

    if (newUser) {
      Accounts.sendEnrollmentEmail(joineeUser._id);
      Ansible.info('Sent invitation email to new user', { invitedBy: this.userId, email });
    } else {
      if (joineeUser._id !== this.userId) {
        const joinerUser = await MeteorUsers.findOneAsync(this.userId);
        const joinerName = joinerUser!.displayName;
        const settingsDoc = await Settings.findOneAsync({ name: 'email.branding' });
        const subject = renderExistingJoinEmailSubject(
          settingsDoc?.value.existingJoinMessageSubjectTemplate,
          hunt
        );
        const text = renderExistingJoinEmail(
          settingsDoc?.value.existingJoinMessageTemplate,
          joineeUser,
          hunt,
          joinerName
        );
        Email.send({
          from: Accounts.emailTemplates.from,
          to: email,
          subject,
          text,
        });
      }

      if (!Flags.active('disable.google') &&
        !Flags.active('disable.gdrive_permissions') &&
        joineeUser.googleAccount) {
        await ensureHuntFolderPermission(huntId, joineeUser._id, joineeUser.googleAccount);
      }
    }
  },
});
