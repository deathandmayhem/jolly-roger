import { z } from "zod";
import { nonEmptyString } from "./customTypes";

const DiscordAccount = z.object({
  id: nonEmptyString,
  username: nonEmptyString,
  discriminator: nonEmptyString,
  avatar: nonEmptyString.optional(),
});

export type DiscordAccountType = z.output<typeof DiscordAccount>;

export default DiscordAccount;
