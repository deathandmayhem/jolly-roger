import { z } from "zod";
import type { Solvedness } from "../solvedness";
import { answer, foreignKey } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

const BookmarkNotificationSolvedness: z.ZodType<Solvedness> = z.enum([
  "noAnswers",
  "solved",
  "unsolved",
]);

// A notification triggered when a bookmarked puzzle changes state
const BookmarkNotification = withCommon(
  z.object({
    // userId of the user who will receive this notification
    user: foreignKey,
    // puzzle that changed state
    puzzle: foreignKey,
    // hunt in which the puzzle resides
    hunt: foreignKey,
    // the new answer
    answer,
    // how solved the puzzle is
    solvedness: BookmarkNotificationSolvedness,
  }),
);

const BookmarkNotifications = new SoftDeletedModel(
  "jr_bookmark_notifications",
  BookmarkNotification,
);
BookmarkNotifications.addIndex({ deleted: 1, user: 1 });
export type BookmarkNotificationType = ModelType<typeof BookmarkNotifications>;

export default BookmarkNotifications;
