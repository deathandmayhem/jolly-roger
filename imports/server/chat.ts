import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import ChatMessages from '../lib/models/chats';
import Hunts from '../lib/models/hunts';
import Profiles from '../lib/models/profiles';
import Puzzles from '../lib/models/puzzles';
import Settings from '../lib/models/settings';
import { DiscordBot } from './discord';

// eslint-disable-next-line import/prefer-default-export
export const sendChatMessage = (puzzleId: string, message: string, sender: string | undefined) => {
  const puzzle = Puzzles.findOne(puzzleId);
  if (!puzzle) {
    throw new Meteor.Error(404, 'Unknown puzzle');
  }

  const msgId = ChatMessages.insert({
    puzzle: puzzleId,
    hunt: puzzle.hunt,
    text: message,
    sender,
    timestamp: new Date(),
  });

  const discordBotTokenDoc = Settings.findOne({ name: 'discord.bot' });
  const botToken = discordBotTokenDoc && discordBotTokenDoc.name === 'discord.bot' && discordBotTokenDoc.value.token;

  const hunt = Hunts.findOne(puzzle.hunt)!;
  if (botToken && hunt.firehoseDiscordChannel) {
    const channel = hunt.firehoseDiscordChannel.id;

    let name: string;
    if (!sender) {
      name = 'Jolly Roger';
    } else {
      name = sender;
      const profile = Profiles.findOne(sender);
      if (profile && profile.discordAccount) {
        name = profile.discordAccount.username;
      } else if (profile && profile.displayName) {
        name = profile.displayName;
      }
    }

    const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzleId}`);
    let title = puzzle.title;
    if (title.length > 25) {
      title = `${title.substring(0, 24)}…`;
    }

    const msg = {
      embed: {
        author: {
          name,
        },
        url,
        title,
        description: message,
      },
      nonce: msgId,
      allowed_mentions: {
        parse: [],
      },
    };

    Meteor.defer(() => {
      // send actual message
      const bot = new DiscordBot(botToken);
      bot.postMessageToChannel(channel, msg);
    });
  }
};

Meteor.methods({
  sendChatMessage(puzzleId: unknown, message: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(message, String);

    sendChatMessage(puzzleId, message, this.userId);
  },
});
