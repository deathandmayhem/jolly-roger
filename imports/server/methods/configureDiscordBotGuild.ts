import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Settings from '../../lib/models/Settings';
import { userMayConfigureDiscordBot } from '../../lib/permission_stubs';
import configureDiscordBotGuild from '../../methods/configureDiscordBotGuild';

configureDiscordBotGuild.define({
  validate(arg) {
    check(arg, {
      guild: Match.Optional({
        id: String,
        name: String,
      }),
    });
    return arg;
  },

  async run({ guild }) {
    check(this.userId, String);

    if (!userMayConfigureDiscordBot(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord Bot');
    }

    if (guild) {
      Ansible.log('Configuring discord bot guild', {
        user: this.userId,
        ...guild,
      });
      await Settings.upsertAsync({ name: 'discord.guild' }, {
        $set: { 'value.guild': guild },
      });
    } else {
      await Settings.removeAsync({ name: 'discord.guild' });
    }
  },
});
