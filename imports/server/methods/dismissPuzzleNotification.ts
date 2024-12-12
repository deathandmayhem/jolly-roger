import { check } from "meteor/check";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import dismissPuzzleNotification from "../../methods/dismissPuzzleNotification";
import defineMethod from "./defineMethod";

defineMethod(dismissPuzzleNotification, {
  validate(arg) {
    check(arg, { puzzleNotificationId: String });

    return arg;
  },

  async run({ puzzleNotificationId }) {
    check(this.userId, String);

    await PuzzleNotifications.removeAsync({
      _id: puzzleNotificationId,
      user: this.userId,
    });
  },
});
