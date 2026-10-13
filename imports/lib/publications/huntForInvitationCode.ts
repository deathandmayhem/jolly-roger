import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Hunts.publications.forInvitationCode",
  z.tuple([
    z.strictObject({
      invitationCode: z.string(),
    }),
  ]),
);
