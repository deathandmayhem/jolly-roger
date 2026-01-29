import { check } from "meteor/check";

import ChatNotifications from "../../lib/models/ChatNotifications";
import dismissChatNotification from "../../methods/dismissChatNotification";
import defineMethod from "./defineMethod";

defineMethod(dismissChatNotification, {
  validate(arg) {
    check(arg, { chatNotificationId: String });

    return arg;
  },

  async run({ chatNotificationId }) {
    check(this.userId, String);

    await ChatNotifications.removeAsync({
      _id: chatNotificationId,
      user: this.userId,
    });
  },
});
