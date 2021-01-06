import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../../ansible';
import DiscordCacheSchema, { DiscordCacheType } from '../schemas/discord_cache';
import { FindOptions } from './base';

const DiscordCache = new Mongo.Collection<DiscordCacheType>('discord_cache');
DiscordCache.attachSchema(DiscordCacheSchema);
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

  if (!this.userId || !Roles.userHasPermission(this.userId, 'discord.viewCache')) {
    Ansible.log('Sub to mongo.discord_cache not logged in as operator');
    return [];
  }

  return DiscordCache.find(q, opts);
});

export default DiscordCache;
