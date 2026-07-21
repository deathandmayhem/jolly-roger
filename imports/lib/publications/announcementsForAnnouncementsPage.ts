import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Announcements.publications.forAnnouncementsPage",
  z.tuple([z.object({ huntId: z.string() })]),
);
