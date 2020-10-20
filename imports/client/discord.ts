import { Mongo } from 'meteor/mongo';

// Psuedo-collection used by setup for selecting guild
export type DiscordGuildType = {
  _id: string;
  name: string;
}
export const DiscordGuilds = new Mongo.Collection<DiscordGuildType>('discord.guilds');
