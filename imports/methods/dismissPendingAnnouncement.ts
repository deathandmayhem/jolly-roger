import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "PendingAnnouncements.methods.dismiss",
  z.tuple([
    z.strictObject({
      pendingAnnouncementId: z.string(),
    }),
  ]),
  z.void(),
);
