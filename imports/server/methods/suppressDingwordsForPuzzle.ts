import { check, Match } from "meteor/check";
import {
  dingedByMentions,
  dingedByRoleMentions,
} from "../../lib/dingwordLogic";
import ChatNotifications from "../../lib/models/ChatNotifications";
import MeteorUsers from "../../lib/models/MeteorUsers";
import suppressDingwordsForPuzzle from "../../methods/suppressDingwordsForPuzzle";
import defineMethod from "./defineMethod";

defineMethod(suppressDingwordsForPuzzle, {
  validate(arg) {
    check(arg, {
      puzzle: String,
      hunt: String,
      dingword: Match.Optional(String),
      dismissUntil: Date,
    });

    return arg;
  },

  async run({ puzzle, hunt, dingword, dismissUntil }) {
    const userId = this.userId;
    check(userId, String);

    const suppressionKey = `suppressedDingwords.${hunt}.${puzzle}`;
    const wordToSuppress = dingword ?? "__ALL__";

    await MeteorUsers.updateAsync(
      { _id: userId },
      { $addToSet: { [suppressionKey]: wordToSuppress } },
    );

    const user = await MeteorUsers.findOneAsync(userId);
    if (!user) return;
    if (!user.suppressedDingwords) user.suppressedDingwords = {};
    if (!user.suppressedDingwords[hunt]) user.suppressedDingwords[hunt] = {};
    if (!user.suppressedDingwords[hunt][puzzle])
      user.suppressedDingwords[hunt][puzzle] = [];

    if (!user.suppressedDingwords[hunt][puzzle].includes(wordToSuppress)) {
      user.suppressedDingwords[hunt][puzzle].push(wordToSuppress);
    }

    if (wordToSuppress === "__ALL__") {
      await ChatNotifications.removeAsync({
        user: userId,
        puzzle: puzzle,
        createdAt: { $lte: dismissUntil },
      });
    } else {
      const currentSuppressed =
        user?.suppressedDingwords?.[hunt]?.[puzzle] || [];
      const notifications = await ChatNotifications.find({
        user: userId,
        puzzle: puzzle,
        createdAt: { $lte: dismissUntil },
      }).fetchAsync();

      for (const cn of notifications) {
        const activeWords =
          cn.dingwords?.filter((word) => !currentSuppressed.includes(word)) ||
          [];
        if (
          activeWords.length === 0 &&
          !dingedByMentions(cn, user) &&
          !dingedByRoleMentions(cn, user)
        ) {
          await ChatNotifications.removeAsync(cn._id);
        }
      }
    }
  },
});
