import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "PendingAnnouncements.publications.forSelf",
  z.tuple([]),
);
