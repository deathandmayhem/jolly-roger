import { check } from "meteor/check";
import Announcements from "../../lib/models/Announcements";
import Bookmarks from "../../lib/models/Bookmarks";
import ChatMessages from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Documents from "../../lib/models/Documents";
import Guesses from "../../lib/models/Guesses";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Puzzles from "../../lib/models/Puzzles";
import CallHistories from "../../lib/models/mediasoup/CallHistories";
import Rooms from "../../lib/models/mediasoup/Rooms";
import { checkAdmin } from "../../lib/permission_stubs";
import purgeHunt from "../../methods/purgeHunt";
import CallActivities from "../models/CallActivities";
import Subscribers from "../models/Subscribers";
import defineMethod from "./defineMethod";
import Tags from "../../lib/models/Tags";

defineMethod(purgeHunt, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const hunt = huntId;
    const DEFAULT_TAGS = [
      "runaround",
      "priority:high",
      "priority:low",
      "group:events",
      "needs:extraction",
      "needs:onsite",
    ];

    await Puzzles.removeAsync({ hunt });
    await Documents.removeAsync({ hunt });
    await ChatMessages.removeAsync({ hunt });
    await Announcements.removeAsync({ hunt });
    await Bookmarks.removeAsync({ hunt });
    await CallActivities.removeAsync({ hunt });
    await ChatNotifications.removeAsync({ hunt });
    await DocumentActivities.removeAsync({ hunt });
    await Guesses.removeAsync({ hunt });
    await CallHistories.removeAsync({ hunt });
    await Rooms.removeAsync({ hunt });
    await PendingAnnouncements.removeAsync({ hunt });
    await PuzzleNotifications.removeAsync({ hunt });
    await Subscribers.removeAsync({ hunt });
    await Tags.removeAsync({ hunt });

  },
});
