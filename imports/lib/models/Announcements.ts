import { z } from "zod";
import { foreignKey, nonEmptyString } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
const Announcement = withCommon(
  z.object({
    hunt: foreignKey,
    message: nonEmptyString,
  }),
);

const Announcements = new SoftDeletedModel("jr_announcements", Announcement);
Announcements.addIndex({ deleted: 1, hunt: 1, createdAt: -1 });
Announcements.addIndex({ hunt: 1 });
export type AnnouncementType = ModelType<typeof Announcements>;

export default Announcements;
