import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.unlinkDiscordAccount",
  z.tuple([]),
  z.void(),
);
