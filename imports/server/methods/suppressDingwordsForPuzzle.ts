import { check, Match } from "meteor/check";
import messageDingsUser from "../../lib/dingwordLogic";
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
      {
        $addToSet: {
          [suppressionKey]: wordToSuppress,
        },
      },
    );

    if (wordToSuppress === "__ALL__") {
      // If we suppressed everything, delete all notifications for this puzzle/user
      // (before the user requested suppression)
      await ChatNotifications.removeAsync({
        user: userId,
        puzzle: puzzle,
        createdAt: { $lte: dismissUntil },
      });
    } else {
      // If we suppressed a specific word, find all relevant notifications
      const notifications = await ChatNotifications.find({
        user: userId,
        puzzle: puzzle,
        createdAt: { $lte: dismissUntil },
      }).fetchAsync();

      for (const cn of notifications) {
        // the message should be dismissed only if it would no longer ding
        // the user

        if (!messageDingsUser(cn, user)) {
          await ChatNotifications.removeAsync(cn._id);
        }
      }
    }
  },
});
