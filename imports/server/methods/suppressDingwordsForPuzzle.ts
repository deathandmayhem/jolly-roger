import { check, Match } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import ChatNotifications from "../../lib/models/ChatNotifications";
import suppressDingwordsForPuzzle from "../../methods/suppressDingwordsForPuzzle";
import defineMethod from "./defineMethod";

defineMethod(suppressDingwordsForPuzzle, {
  validate(arg) {
    check(arg, {
      puzzle: String,
      hunt: String,
      dingword: Match.Optional(String),
    });

    return arg;
  },

  async run({ puzzle, hunt, dingword }) {
    const userId = this.userId;
    check(userId, String);

    const suppressionKey = `suppressedDingwords.${hunt}.${puzzle}`;
    const wordToSuppress = dingword ?? "__ALL__";

    await MeteorUsers.updateAsync(
      { _id: userId },
      {
        $addToSet: {
          [suppressionKey]: wordToSuppress,
        },
      },
    );

    const user = await MeteorUsers.findOneAsync(userId, {
      projection: { suppressedDingwords: 1 },
    });
    const currentSuppressed = user?.suppressedDingwords?.[hunt]?.[puzzle] || [];

    if (wordToSuppress === "__ALL__") {
      // If we suppressed everything, delete all notifications for this puzzle/user
      await ChatNotifications.removeAsync({
        user: userId,
        puzzle: puzzle,
      });
    } else {
      // If we suppressed a specific word, find all relevant notifications
      const notifications = await ChatNotifications.find({
        user: userId,
        puzzle: puzzle,
      }).fetchAsync();

      for (const cn of notifications) {
        // A notification should be dismissed if EVERY word that triggered it
        // is now in the suppressed list.
        const activeWords =
          cn.dingwords?.filter((word) => !currentSuppressed.includes(word)) ||
          [];

        if (activeWords.length === 0 && cn.dingwords?.length > 0) {
          await ChatNotifications.removeAsync(cn._id);
        }
      }
    }
  },
});