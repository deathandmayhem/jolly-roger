import { z } from "zod";
import { foreignKey, nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

// A notification triggered by a chat message sent by a user.
const PuzzleNotification = withCommon(
  z.object({
    // The userId of the user for whom this notification targets.
    user: foreignKey,
    // The hunt in which the puzzle resides.
    hunt: foreignKey,
    // The puzzle that generated this notification.
    puzzle: foreignKey,
    // The notification content.
    content: nonEmptyString,
    // Whether this should be ephemeral
    ephemeral: z.boolean().optional(),
    className: nonEmptyString.optional(), // mainly here to not break the old data
    background: nonEmptyString,
  }),
);

const PuzzleNotifications = new SoftDeletedModel(
  "jr_puzzlenotifications",
  PuzzleNotification,
);
PuzzleNotifications.addIndex({ deleted: 1, user: 1 });
export type PuzzleNotificationType = ModelType<typeof PuzzleNotifications>;

export default PuzzleNotifications;
