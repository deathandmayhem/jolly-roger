import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "BookmarkNotifications.methods.dismiss",
  z.tuple([
    z.strictObject({
      bookmarkNotificationId: z.string(),
    }),
  ]),
  z.void(),
);
