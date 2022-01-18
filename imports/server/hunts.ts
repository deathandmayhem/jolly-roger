import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import Mustache from 'mustache';
import Ansible from '../ansible';
import Flags from '../flags';
import Hunts from '../lib/models/hunts';
import MeteorUsers from '../lib/models/meteor_users';
import Profiles from '../lib/models/profiles';
import Settings from '../lib/models/settings';
import {
  addUserToRole,
  checkAdmin,
  userMayAddUsersToHunt,
  userMayBulkAddToHunt,
  userMayUseDiscordBotAPIs,
} from '../lib/permission_stubs';
import { HuntType } from '../lib/schemas/hunt';
import { SettingType } from '../lib/schemas/setting';
import addUserToDiscordRole from './addUserToDiscordRole';
import List from './blanche';
import {
  ensureHuntFolder, ensureHuntFolderPermission, huntFolderName, renameDocument,
} from './gdrive';

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

function renderExistingJoinEmail(
  setting: SettingType | undefined,
  user: Meteor.User | null,
  hunt: HuntType,
  joinerName: string | null
) {
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

const SavedDiscordObjectFields = {
  id: String,
  name: String,
};

const HuntShape = {
  name: String,
  mailingLists: [String] as [StringConstructor],
  signupMessage: Match.Optional(String),
  openSignups: Boolean,
  hasGuessQueue: Boolean,
  submitTemplate: Match.Optional(String),
  homepageUrl: Match.Optional(String),
  puzzleHooksDiscordChannel: Match.Optional(SavedDiscordObjectFields),
  firehoseDiscordChannel: Match.Optional(SavedDiscordObjectFields),
  memberDiscordRole: Match.Optional(SavedDiscordObjectFields),
};

Meteor.methods({
  createHunt(value: unknown) {
    check(this.userId, String);
    checkAdmin(this.userId);
    check(value, HuntShape);

    const huntId = Hunts.insert(value);
    addUserToRole(this.userId, huntId, 'operator');

    Meteor.defer(() => {
      // Sync discord roles
      MeteorUsers.find({ hunts: huntId })
        .forEach((u) => {
          addUserToDiscordRole(u._id, huntId);
        });
      ensureHuntFolder({ _id: huntId, name: value.name });
    });

    return huntId;
  },

  updateHunt(huntId: unknown, value: unknown) {
    check(this.userId, String);
    checkAdmin(this.userId);
    check(huntId, String);
    check(value, HuntShape);

    const oldHunt = Hunts.findOne(huntId);

    // $set will not remove keys from a document.  For that, we must specify
    // $unset on the appropriate key(s).  Split out which keys we must set and
    // unset to achieve the desired final state.
    const toSet: { [key: string]: any; } = {};
    const toUnset: { [key: string]: string; } = {};
    Object.keys(HuntShape).forEach((key: string) => {
      const typedKey = key as keyof typeof HuntShape;
      if (value[typedKey] === undefined) {
        toUnset[typedKey] = '';
      } else {
        toSet[typedKey] = value[typedKey];
      }
    });

    Hunts.update(
      { _id: huntId },
      {
        $set: toSet,
        $unset: toUnset,
      }
    );

    Meteor.defer(() => {
      // Sync discord roles
      MeteorUsers.find({ hunts: huntId })
        .forEach((u) => {
          addUserToDiscordRole(u._id, huntId);
        });

      if (oldHunt?.name !== value.name) {
        const folderId = ensureHuntFolder({ _id: huntId, name: value.name });
        renameDocument(folderId, huntFolderName(value.name));
      }
    });
  },

  destroyHunt(huntId: unknown) {
    check(this.userId, String);
    checkAdmin(this.userId);
    check(huntId, String);

    Hunts.destroy(huntId);
  },

  addToHunt(huntId: unknown, email: unknown) {
    check(huntId, String);
    check(email, String);
    check(this.userId, String);

    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    if (!userMayAddUsersToHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, `User ${this.userId} may not add members to ${huntId}`);
    }

    let joineeUser = <Meteor.User | undefined>Accounts.findUserByEmail(email);
    const newUser = joineeUser === undefined;
    if (!joineeUser) {
      const joineeUserId = Accounts.createUser({ email });
      joineeUser = MeteorUsers.findOne(joineeUserId)!;
    }
    if (!joineeUser._id) throw new Meteor.Error(500, 'Something has gone terribly wrong');

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
    MeteorUsers.update(joineeUser._id, { $addToSet: { hunts: { $each: [huntId] } } });
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
    } else {
      if (joineeUser._id !== this.userId) {
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

      if (!Flags.active('disable.google') && !Flags.active('disable.gdrive_permissions')) {
        const joineeProfile = Profiles.findOne(joineeUser._id);
        if (joineeProfile?.googleAccount) {
          ensureHuntFolderPermission(huntId, joineeUser._id, joineeProfile.googleAccount);
        }
      }
    }
  },

  bulkAddToHunt(huntId: unknown, emails: unknown) {
    check(huntId, String);
    check(emails, [String]);
    check(this.userId, String);

    if (!userMayBulkAddToHunt(this.userId, huntId)) {
      throw new Meteor.Error(401, `User ${this.userId} may not bulk-invite to hunt ${huntId}`);
    }

    // We'll re-do this check but if we check it now the error reporting will be
    // better
    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    const errors: { email: string, error: any }[] = [];
    emails.forEach((email) => {
      try {
        Meteor.call('addToHunt', huntId, email);
      } catch (error) {
        errors.push({ email, error });
      }
    });

    if (errors.length > 0) {
      const message = errors.map(({ email, error }) => {
        const err = error.sanitizedError ?? error;
        return `${email}: ${err.reason}`;
      })
        .join('\n');
      throw new Meteor.Error(500, `Failed to send invites for some emails:\n${message}`);
    }
  },

  syncDiscordRole(huntId: unknown) {
    check(huntId, String);
    check(this.userId, String);

    if (!userMayUseDiscordBotAPIs(this.userId)) {
      throw new Meteor.Error(401, `User ${this.userId} not permitted to access Discord bot APIs`);
    }

    MeteorUsers.find({ hunts: huntId })
      .forEach((u) => {
        addUserToDiscordRole(u._id, huntId);
      });
  },
});
