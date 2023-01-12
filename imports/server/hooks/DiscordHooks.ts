import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import ChatMessages from '../../lib/models/ChatMessages';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import Settings from '../../lib/models/Settings';
import Tags from '../../lib/models/Tags';
import { ChatMessageContentType, nodeIsText } from '../../lib/schemas/ChatMessage';
import { computeSolvedness } from '../../lib/solvedness';
import { DiscordBot } from '../discord';
import Hookset from './Hookset';

async function makeDiscordBotFromSettings(): Promise<DiscordBot | undefined> {
  // Above all else, obey the circuit breaker
  if (Flags.active('disable.discord')) {
    return undefined;
  }

  const botSettings = await Settings.findOneAsync({ name: 'discord.bot' });
  if (!botSettings || botSettings.name !== 'discord.bot') {
    return undefined;
  }

  const token = botSettings.value?.token;
  if (!token) {
    return undefined;
  }

  return new DiscordBot(token);
}

async function renderChatMessageV2Content(content: ChatMessageContentType): Promise<string> {
  const chunks = await Promise.all(content.children.map(async (child) => {
    if (nodeIsText(child)) {
      return child.text;
    } else {
      const user = await MeteorUsers.findOneAsync(child.userId);
      return ` @${user?.displayName ?? child.userId} `;
    }
  }));
  return chunks.join('');
}

const DiscordHooks: Hookset = {
  async onPuzzleCreated(puzzleId: string) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = (await Puzzles.findOneAsync(puzzleId))!;
    const hunt = (await Hunts.findOneAsync(puzzle.hunt))!;
    if (hunt.puzzleHooksDiscordChannel) {
      const title = `${puzzle.title} unlocked`;
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const tagNameList = await Tags.find({ _id: { $in: puzzle.tags } }).mapAsync((t) => t.name);
      const tags = tagNameList.map((tagName) => `\`${tagName}\``).join(', ');
      const fields = tags.length > 0 ? [{ name: 'Tags', value: tags, inline: true }] : undefined;
      const messageObj = {
        embed: {
          title,
          url,
          fields,
        },
      };
      await bot.postMessageToChannel(hunt.puzzleHooksDiscordChannel.id, messageObj);
    }
  },

  async onPuzzleSolved(puzzleId: string) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = (await Puzzles.findOneAsync(puzzleId))!;
    const hunt = (await Hunts.findOneAsync(puzzle.hunt))!;
    if (hunt.puzzleHooksDiscordChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const answers = puzzle.answers.map((answer) => `\`${answer}\``).join(', ');
      const answerLabel = `Answer${puzzle.expectedAnswerCount > 1 ? 's' : ''}`;
      const solvedness = computeSolvedness(puzzle);
      const color = {
        solved: 0x00ff00,
        unsolved: 0xffff00,
        noAnswers: 0,
      }[solvedness];
      const solvedStr = {
        solved: 'solved',
        unsolved: 'partially solved',
        noAnswers: '',
      }[solvedness];
      const title = `${puzzle.title} ${solvedStr}`;
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
      await bot.postMessageToChannel(hunt.puzzleHooksDiscordChannel.id, messageObj);
    }
  },

  async onChatMessageCreated(chatMessageId: string) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const chatMessage = (await ChatMessages.findOneAsync(chatMessageId))!;
    const puzzle = (await Puzzles.findOneAsync(chatMessage.puzzle))!;
    const hunt = (await Hunts.findOneAsync(chatMessage.hunt))!;
    if (hunt.firehoseDiscordChannel) {
      const channel = hunt.firehoseDiscordChannel.id;

      let name: string;
      if (!chatMessage.sender) {
        name = 'Jolly Roger';
      } else {
        name = chatMessage.sender;
        const user = await MeteorUsers.findOneAsync(chatMessage.sender);
        if (user?.discordAccount) {
          name = user.discordAccount.username;
        } else if (user?.displayName) {
          name = user.displayName;
        }
      }

      const url = Meteor.absoluteUrl(`hunts/${chatMessage.hunt}/puzzles/${chatMessage.puzzle}`);
      let title = puzzle.title;
      if (title.length > 25) {
        title = `${title.substring(0, 24)}…`;
      }

      let description: string;
      if (chatMessage.content) {
        description = await renderChatMessageV2Content(chatMessage.content);
      } else {
        description = chatMessage.text!;
      }

      const msg = {
        embed: {
          author: {
            name,
          },
          url,
          title,
          description,
        },
        nonce: chatMessageId,
        allowed_mentions: {
          parse: [],
        },
      };

      void bot.postMessageToChannel(channel, msg);
    }
  },
};

export default DiscordHooks;
