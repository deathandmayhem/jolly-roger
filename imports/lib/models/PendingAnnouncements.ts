import { z } from "zod";
import { foreignKey } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncement = withCommon(
  z.object({
    hunt: foreignKey,
    announcement: foreignKey,
    user: foreignKey,
  }),
);

const PendingAnnouncements = new SoftDeletedModel(
  "jr_pending_announcements",
  PendingAnnouncement,
);
PendingAnnouncements.addIndex({ user: 1 });
PendingAnnouncements.addIndex({ hunt: 1 });
export type PendingAnnouncementType = ModelType<typeof PendingAnnouncements>;

export default PendingAnnouncements;
