import { check, Match } from "meteor/check";
import ChatNotifications from "../../lib/models/ChatNotifications";
import dismissAllDingsForPuzzle from "../../methods/dismissAllDingsForPuzzle";
import defineMethod from "./defineMethod";

defineMethod(dismissAllDingsForPuzzle, {
  validate(arg) {
    check(arg, {
      puzzle: String,
      hunt: String,
      dismissUntil: Date,
    });

    return arg;
  },

  async run({ puzzle, hunt, dismissUntil }) {
    const userId = this.userId;
    check(userId, String);
    await ChatNotifications.removeAsync({
      user: userId,
      puzzle: puzzle,
      createdAt: { $lte: dismissUntil },
    });
  },
});
