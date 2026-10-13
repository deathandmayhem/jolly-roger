import { check } from "meteor/check";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import dismissPendingAnnouncement from "../../methods/dismissPendingAnnouncement";
import defineMethod from "./defineMethod";

defineMethod(dismissPendingAnnouncement, {
  async run({ pendingAnnouncementId }) {
    check(this.userId, String);

    await PendingAnnouncements.removeAsync({
      _id: pendingAnnouncementId,
      user: this.userId,
    });
  },
});
