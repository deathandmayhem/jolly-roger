import { check } from 'meteor/check';
import ChatNotifications from '../../lib/models/ChatNotifications';
import dismissChatNotification from '../../methods/dismissChatNotification';

dismissChatNotification.define({
  validate(arg) {
    check(arg, { chatNotificationId: String });

    return arg;
  },

  run({ chatNotificationId }) {
    check(this.userId, String);

    await ChatNotifications.removeAsync({
      _id: chatNotificationId,
      user: this.userId,
    });
  },
});
