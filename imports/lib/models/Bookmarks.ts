import { z } from "zod";
import { foreignKey } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

// Broadcast announcements that have not yet been viewed by a given
// user
const Bookmark = withCommon(
  z.object({
    hunt: foreignKey,
    puzzle: foreignKey,
    user: foreignKey,
  }),
);

const Bookmarks = new SoftDeletedModel("jr_bookmarks", Bookmark);
Bookmarks.addIndex({ user: 1, hunt: 1, puzzle: 1 }, { unique: true });
Bookmarks.addIndex({ puzzle: 1 });
Bookmarks.addIndex({ hunt: 1 });
export type BookmarkType = ModelType<typeof Bookmarks>;

export default Bookmarks;
