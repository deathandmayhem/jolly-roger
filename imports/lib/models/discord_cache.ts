import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../../ansible';
import DiscordCacheSchema, { DiscordCacheType } from '../schemas/discord_cache';
import { FindOptions } from './base';
import Settings from './settings';

const DiscordCache = new Mongo.Collection<DiscordCacheType>('discord_cache');
DiscordCache.attachSchema(DiscordCacheSchema);
if (Meteor.isServer) {
  Meteor.publish('discord.guilds', function () {
    if (!this.userId || !Roles.userHasPermission(this.userId, 'discord.configureBot')) {
      Ansible.log('Sub to discord.guilds not logged in as admin');
      return [];
    }

    return DiscordCache.find({ type: 'guild' });
  });

  Meteor.publish('discord.cache', function (
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

    if (!this.userId || !Roles.userHasPermission(this.userId, 'discord.useBotAPIs')) {
      Ansible.log('Sub to discord.cache not logged in as operator');
      return [];
    }

    const guildSetting = Settings.findOne({ name: 'discord.guild' });
    if (!guildSetting || guildSetting.name !== 'discord.guild') {
      Ansible.log('No discord guild configured; will not expose the cache');
      return [];
    }

    const guildId = guildSetting.value && guildSetting.value.guild && guildSetting.value.guild.id;
    if (!guildId) {
      Ansible.log('No discord guild configured; will not expose the cache');
      return [];
    }

    return DiscordCache.find({ ...q, 'object.guild': guildId }, opts);
  });
}

export default DiscordCache;
