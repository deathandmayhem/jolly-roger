import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "BookmarkNotifications.publications.forSelf",
  z.tuple([]),
);
