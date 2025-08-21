import Announcements from "../../lib/models/Announcements";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import pendingAnnouncementsForSelf from "../../lib/publications/pendingAnnouncementsForSelf";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

definePublication(pendingAnnouncementsForSelf, {
  async run() {
    if (!this.userId) {
      return [];
    }

    await publishJoinedQuery(
      this,
      {
        model: PendingAnnouncements,
        foreignKeys: [
          {
            field: "announcement",
            join: {
              model: Announcements,
              foreignKeys: [
                {
                  field: "createdBy",
                  join: {
                    model: MeteorUsers,
                    projection: { displayName: 1 },
                  },
                },
              ],
            },
          },
        ],
      },
      { user: this.userId },
    );
    this.ready();

    return undefined;
  },
});
