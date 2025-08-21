import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import bookmarkNotificationsForSelf from "../../lib/publications/bookmarkNotificationsForSelf";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

definePublication(bookmarkNotificationsForSelf, {
  async run() {
    if (!this.userId) {
      return [];
    }

    await publishJoinedQuery(
      this,
      {
        model: BookmarkNotifications,
        foreignKeys: [
          {
            field: "puzzle",
            join: { model: Puzzles, allowDeleted: true },
          },
          {
            field: "hunt",
            join: { model: Hunts },
          },
        ],
      },
      { user: this.userId },
    );
    this.ready();

    return undefined;
  },
});
