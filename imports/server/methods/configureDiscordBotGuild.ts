import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import { userMayConfigureDiscordBot } from '../../lib/permission_stubs';
import { optional } from '../../methods/TypedMethod';
import configureDiscordBotGuild from '../../methods/configureDiscordBotGuild';

configureDiscordBotGuild.define({
  validate(arg) {
    check(arg, {
      guild: optional({
        id: String,
        name: String,
      }),
    });
    return arg;
  },

  async run({ guild }) {
    check(this.userId, String);

    if (!userMayConfigureDiscordBot(await MeteorUsers.findOneAsync(this.userId))) {
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
