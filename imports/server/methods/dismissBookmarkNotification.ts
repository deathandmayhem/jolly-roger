import { check } from "meteor/check";
import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import dismissBookmarkNotification from "../../methods/dismissBookmarkNotification";
import defineMethod from "./defineMethod";

defineMethod(dismissBookmarkNotification, {
  async run({ bookmarkNotificationId }) {
    check(this.userId, String);

    await BookmarkNotifications.removeAsync({
      _id: bookmarkNotificationId,
      user: this.userId,
    });
  },
});
