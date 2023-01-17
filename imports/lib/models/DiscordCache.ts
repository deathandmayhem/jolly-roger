import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Logger from '../../Logger';
import {
  userMayUseDiscordBotAPIs,
  userMayConfigureDiscordBot,
} from '../permission_stubs';
import type { DiscordCacheType } from '../schemas/DiscordCache';
import type { FindOptions } from './Base';
import MeteorUsers from './MeteorUsers';
import Settings from './Settings';

const DiscordCache = new Mongo.Collection<DiscordCacheType>('discord_cache');
if (Meteor.isServer) {
  Meteor.publish('discord.guilds', async function () {
    if (!this.userId || !userMayConfigureDiscordBot(await MeteorUsers.findOneAsync(this.userId))) {
      Logger.info('Sub to discord.guilds not logged in as admin');
      return [];
    }

    return DiscordCache.find({ type: 'guild' });
  });

  Meteor.publish('discord.cache', async function (
    q: Mongo.Selector<DiscordCacheType> = {},
    opts: FindOptions = {},
  ) {
    check(q, Object);
    check(opts, {
      fields: Match.Maybe(Object),
      sort: Match.Maybe(Object),
      skip: Match.Maybe(Number),
      limit: Match.Maybe(Number),
    });

    if (!this.userId || !userMayUseDiscordBotAPIs(await MeteorUsers.findOneAsync(this.userId))) {
      Logger.info('Sub to discord.cache not logged in as operator');
      return [];
    }

    const guildSetting = Settings.findOne({ name: 'discord.guild' });
    if (!guildSetting || guildSetting.name !== 'discord.guild') {
      Logger.info('No discord guild configured; will not expose the cache');
      return [];
    }

    const guildId = guildSetting.value?.guild?.id;
    if (!guildId) {
      Logger.info('No discord guild configured; will not expose the cache');
      return [];
    }

    return DiscordCache.find({ ...q, 'object.guild': guildId }, opts);
  });
}

export default DiscordCache;
