import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.acceptHuntInvitationCode",
  z.tuple([
    z.object({ invitationCode: z.string(), email: z.string().optional() }),
  ]),
  z.string(),
);
