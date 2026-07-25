import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "APIKeys.publications.forSelf",
  z.tuple([]),
);
