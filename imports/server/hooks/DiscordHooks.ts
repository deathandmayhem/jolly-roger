import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import Announcements from "../../lib/models/Announcements";
import type { ChatMessageContentType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import Settings from "../../lib/models/Settings";
import Tags from "../../lib/models/Tags";
import nodeIsImage from "../../lib/nodeIsImage";
import nodeIsRoleMention from "../../lib/nodeIsRoleMention";
import nodeIsText from "../../lib/nodeIsText";
import { computeSolvedness } from "../../lib/solvedness";
import { DiscordBot } from "../discord";
import type Hookset from "./Hookset";

async function makeDiscordBotFromSettings(): Promise<DiscordBot | undefined> {
  // Above all else, obey the circuit breaker
  if (await Flags.activeAsync("disable.discord")) {
    return undefined;
  }

  const botSettings = await Settings.findOneAsync({ name: "discord.bot" });
  if (botSettings?.name !== "discord.bot") {
    return undefined;
  }

  const token = botSettings.value?.token;
  if (!token) {
    return undefined;
  }

  return new DiscordBot(token);
}

type DescriptionContent = { description: string };
type ImageContent = { image: { url: string } };
type Content = DescriptionContent | ImageContent;
async function renderChatMessageContent(
  content: ChatMessageContentType,
): Promise<Content> {
  if (content.children.length === 1 && nodeIsImage(content.children[0]!)) {
    return { image: { url: content.children[0].url } };
  }

  const chunks = await Promise.all(
    content.children.map(async (child) => {
      if (nodeIsImage(child)) {
        return ` ${child.url} `;
      }
      if (nodeIsText(child)) {
        return child.text;
      }
      if (nodeIsRoleMention(child)) {
        return ` @${child.roleId} `;
      }
      const user = await MeteorUsers.findOneAsync(child.userId);
      return ` @${user?.displayName ?? child.userId} `;
    }),
  );

  return { description: chunks.join("") };
}

const DiscordHooks: Hookset = {
  name: "DiscordHooks",

  async onAnnouncement(announcementId: string) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const announcement = (await Announcements.findOneAsync(announcementId))!;
    const sender = (await MeteorUsers.findOneAsync(announcement.createdBy))!;
    const hunt = (await Hunts.findOneAsync(announcement.hunt))!;
    const messageObj = {
      embed: {
        title: `Announcement from ${sender.displayName ?? sender._id}`,
        description: announcement.message,
      },
    };
    if (hunt.announcementDiscordChannel) {
      await bot.postMessageToChannel(
        hunt.announcementDiscordChannel.id,
        messageObj,
      );
    }
  },

  async onPuzzleCreated(puzzleId: string) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = (await Puzzles.findOneAsync(puzzleId))!;
    const hunt = (await Hunts.findOneAsync(puzzle.hunt))!;
    if (hunt.puzzleCreationDiscordChannel) {
      const title = `${puzzle.title} unlocked`;
      const url = Meteor.absoluteUrl(
        `hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
      );
      const tagNameList = await Tags.find({
        _id: { $in: puzzle.tags },
      }).mapAsync((t) => t.name);
      const tags = tagNameList.map((tagName) => `\`${tagName}\``).join(", ");
      const fields =
        tags.length > 0
          ? [{ name: "Tags", value: tags, inline: true }]
          : undefined;
      const messageObj = {
        embed: {
          title,
          url,
          fields,
        },
      };
      await bot.postMessageToChannel(
        hunt.puzzleCreationDiscordChannel.id,
        messageObj,
      );
    }
  },

  async onPuzzleUpdated(puzzleId: string, oldPuzzle: PuzzleType) {
    const bot = await makeDiscordBotFromSettings();
    if (!bot) {
      return;
    }

    const puzzle = (await Puzzles.findOneAsync(puzzleId))!;
    if (puzzle.title === oldPuzzle.title) {
      return;
    }

    const hunt = (await Hunts.findOneAsync(puzzle.hunt))!;
    if (hunt.firehoseDiscordChannel) {
      const title = `${oldPuzzle.title} renamed to ${puzzle.title}`;
      const url = Meteor.absoluteUrl(
        `hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
      );
      const tagNameList = await Tags.find({
        _id: { $in: puzzle.tags },
      }).mapAsync((t) => t.name);
      const tags = tagNameList.map((tagName) => `\`${tagName}\``).join(", ");
      const fields =
        tags.length > 0
          ? [{ name: "Tags", value: tags, inline: true }]
          : undefined;
      const messageObj = {
        embed: {
          title,
          url,
          fields,
        },
      };
      await bot.postMessageToChannel(
        hunt.firehoseDiscordChannel.id,
        messageObj,
      );
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
      const url = Meteor.absoluteUrl(
        `hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
      );
      const answers = puzzle.answers
        .map((answer) => `\`${answer}\``)
        .join(", ");
      const answerLabel = `Answer${puzzle.expectedAnswerCount > 1 ? "s" : ""}`;
      const solvedness = computeSolvedness(puzzle);
      const color = {
        solved: 0x00ff00,
        unsolved: 0xffff00,
        noAnswers: 0,
      }[solvedness];
      const solvedStr = {
        solved: "solved",
        unsolved: "partially solved",
        noAnswers: "",
      }[solvedness];
      const title = `${puzzle.title} ${solvedStr}`;
      const messageObj = {
        embed: {
          color,
          title,
          url,
          fields: [{ name: answerLabel, value: answers, inline: true }],
        },
      };
      await bot.postMessageToChannel(
        hunt.puzzleHooksDiscordChannel.id,
        messageObj,
      );
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
        name = "Jolly Roger";
      } else {
        name = chatMessage.sender;
        const user = await MeteorUsers.findOneAsync(chatMessage.sender);
        if (user?.discordAccount) {
          name = user.discordAccount.username;
        } else if (user?.displayName) {
          name = user.displayName;
        }
      }

      const url = Meteor.absoluteUrl(
        `hunts/${chatMessage.hunt}/puzzles/${chatMessage.puzzle}`,
      );
      let title = puzzle.title;
      if (title.length > 25) {
        title = `${title.substring(0, 24)}…`;
      }

      const description = await renderChatMessageContent(chatMessage.content);
      const msg = {
        embed: {
          author: {
            name,
          },
          url,
          title,
          ...description,
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
