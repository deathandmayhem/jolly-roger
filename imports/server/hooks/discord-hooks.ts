import { Meteor } from 'meteor/meteor';
import Flags from '../../flags';
import ChatMessages from '../../lib/models/chats';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import Settings from '../../lib/models/settings';
import Tags from '../../lib/models/tags';
import { DiscordBot } from '../discord';
import Hookset from './hookset';

function makeDiscordBotFromSettings(): DiscordBot | undefined {
  // Above all else, obey the circuit breaker
  if (Flags.active('disable.discord')) {
    return undefined;
  }

  const botSettings = Settings.findOne({ name: 'discord.bot' });
  if (!botSettings || botSettings.name !== 'discord.bot') {
    return undefined;
  }

  const token = botSettings.value && botSettings.value.token;
  if (!token) {
    return undefined;
  }

  return new DiscordBot(token);
}

const DiscordHooks: Hookset = {
  onPuzzleCreated(puzzleId: string) {
    const bot = makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = Puzzles.findOne(puzzleId)!;
    const hunt = Hunts.findOne(puzzle.hunt)!;
    if (hunt.puzzleHooksDiscordChannel) {
      const title = `${puzzle.title} unlocked`;
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const tagNameList = puzzle.tags.map((tId) => {
        const t = Tags.findOne(tId);
        return t ? t.name : '';
      }).filter((t) => t.length > 0);
      const tags = tagNameList.map((tagName) => `\`${tagName}\``).join(', ');
      const messageObj = {
        embed: {
          title,
          url,
          fields: [
            { name: 'Tags', value: tags, inline: true },
          ],
        },
      };
      bot.postMessageToChannel(hunt.puzzleHooksDiscordChannel.id, messageObj);
    }
  },

  onPuzzleSolved(puzzleId: string) {
    const bot = makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = Puzzles.findOne(puzzleId)!;
    const hunt = Hunts.findOne(puzzle.hunt)!;
    if (hunt.puzzleHooksDiscordChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const answers = puzzle.answers.map((answer) => `\`${answer}\``).join(', ');
      const answerLabel = `Answer${puzzle.expectedAnswerCount > 1 ? 's' : ''}`;
      const completed = puzzle.answers.length === puzzle.expectedAnswerCount;
      const color = completed ? 0x00ff00 : 0xffff00;
      const title = `${puzzle.title} ${completed ? '' : 'partially'} solved`;
      const messageObj = {
        embed: {
          color,
          title,
          url,
          fields: [
            { name: answerLabel, value: answers, inline: true },
          ],
        },
      };
      bot.postMessageToChannel(hunt.puzzleHooksDiscordChannel.id, messageObj);
    }
  },

  onChatMessageCreated(chatMessageId: string) {
    const bot = makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const chatMessage = ChatMessages.findOne(chatMessageId)!;
    const puzzle = Puzzles.findOne(chatMessage.puzzle)!;
    const hunt = Hunts.findOne(chatMessage.hunt)!;
    if (hunt.firehoseDiscordChannel) {
      const channel = hunt.firehoseDiscordChannel.id;

      let name: string;
      if (!chatMessage.sender) {
        name = 'Jolly Roger';
      } else {
        name = chatMessage.sender;
        const profile = Profiles.findOne(chatMessage.sender);
        if (profile && profile.discordAccount) {
          name = profile.discordAccount.username;
        } else if (profile && profile.displayName) {
          name = profile.displayName;
        }
      }

      const url = Meteor.absoluteUrl(`hunts/${chatMessage.hunt}/puzzles/${chatMessage.puzzle}`);
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
          description: chatMessage.text,
        },
        nonce: chatMessageId,
        allowed_mentions: {
          parse: [],
        },
      };

      Meteor.defer(() => {
        // send actual message
        bot.postMessageToChannel(channel, msg);
      });
    }
  },
};

export default DiscordHooks;
