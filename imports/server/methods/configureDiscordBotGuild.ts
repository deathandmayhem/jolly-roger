import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Logger from '../../Logger';
import MeteorUsers from '../../lib/models/MeteorUsers';
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

    if (!userMayConfigureDiscordBot(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord Bot');
    }

    if (guild) {
      Logger.info('Configuring discord bot guild', guild);
      await Settings.upsertAsync({ name: 'discord.guild' }, {
        $set: { 'value.guild': guild },
      });
    } else {
      await Settings.removeAsync({ name: 'discord.guild' });
    }
  },
});
