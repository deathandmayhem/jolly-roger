import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Settings from '../../lib/models/Settings';
import { userMayConfigureDiscordBot } from '../../lib/permission_stubs';
import configureDiscordBot from '../../methods/configureDiscordBot';

configureDiscordBot.define({
  validate(arg) {
    check(arg, {
      token: String,
    });
    return arg;
  },

  run({ token }) {
    check(this.userId, String);

    if (!userMayConfigureDiscordBot(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord Bot');
    }

    if (token) {
      Ansible.log('Configuring discord bot token (token redacted)', {
        user: this.userId,
      });
      await Settings.upsertAsync(
        { name: 'discord.bot' },
        { $set: { 'value.token': token } }
      );
    } else {
      Ansible.log('Discarding discord bot token', {
        user: this.userId,
      });
      await Settings.removeAsync({ name: 'discord.bot' });
    }
  },
});
