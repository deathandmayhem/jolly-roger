import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureDiscordBotGuild",
  z.tuple([
    z.strictObject({
      guild: z.strictObject({ id: z.string(), name: z.string() }).optional(),
    }),
  ]),
  z.void(),
);
