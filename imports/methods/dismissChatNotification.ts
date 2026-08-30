import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "ChatNotifications.methods.dismiss",
  z.tuple([
    z.strictObject({
      chatNotificationId: z.string(),
    }),
  ]),
  z.void(),
);
