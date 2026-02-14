import { z } from "zod";
import { foreignKey, nonEmptyString, stringId } from "./customTypes";
import type { DiscordAccountType } from "./DiscordAccount";
import DiscordAccount from "./DiscordAccount";
import validateSchema from "./validateSchema";

declare module "meteor/meteor" {
  namespace Meteor {
    interface User {
      lastLogin?: Date;
      hunts?: string[];
      // Hunts the user was removed from. We keep this so their display name
      // and avatar remain resolvable in historical chat messages, guesses, etc.
      formerHunts?: string[];
      huntTermsAcceptedAt?: Record<string, Date>;
      roles?: Record<string, string[]>; // scope -> roles
      displayName?: string;
      googleAccount?: string;
      /**
       * A historical note: we have not always collected googleAccountId, so it
       * is possible that googleAccount is populated while googleAccountId is
       * not. However, the reverse should not happen
       */
      googleAccountId?: string;
      googleProfilePicture?: string; // Never guaranteed to be set, even if googleAccount and googleAccountId are
      discordAccount?: DiscordAccountType;
      phoneNumber?: string;
      dingwords?: string[];
    }
  }
}

// Note: this needs to exactly match the type of Meteor.User, otherwise we will
// fail typechecking when we use our attachSchema function. Also, because
// Meteor.users isn't a Model, we can't rely on transforms or defaults in this
// schema.
export const User = z.object({
  _id: stringId,
  username: z
    .string()
    .regex(/^[a-z0-9A-Z_]{3,15}$/)
    .optional(),
  emails: z
    .object({ address: z.string().email(), verified: z.boolean() })
    .array()
    .optional(),
  createdAt: z.date().optional(),
  lastLogin: z.date().optional(),
  services: z.any().optional(),
  profile: z.object({}).optional(),
  roles: z.record(z.string(), nonEmptyString.array()).optional(),
  hunts: foreignKey.array().optional(),
  formerHunts: foreignKey.array().optional(),
  huntTermsAcceptedAt: z.record(z.string(), z.date()).optional(),
  displayName: nonEmptyString.optional(),
  googleAccount: nonEmptyString.optional(),
  googleAccountId: nonEmptyString.optional(),
  googleProfilePicture: nonEmptyString.optional(),
  discordAccount: DiscordAccount.optional(),
  phoneNumber: nonEmptyString.optional(),
  dingwords: nonEmptyString.array().optional(),
});
validateSchema(User);

export function primaryEmail(user: {
  emails?: { address: string }[];
}): string | undefined {
  return user.emails?.[0]?.address;
}

export type ProfileFields =
  | "displayName"
  | "googleAccount"
  | "discordAccount"
  | "phoneNumber"
  | "dingwords";
