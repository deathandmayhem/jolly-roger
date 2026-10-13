import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "InvitationCodes.publications.forHunt",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
