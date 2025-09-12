import { Accounts } from "meteor/accounts-base";

Accounts.config({
  forbidClientAccountCreation: true,
  sendVerificationEmail: true,
  // Meteor's accounts-password has a bug wherein all tokens will be removed from the database
  // according to the expiry rules of password reset tokens.  To avoid enrollment tokens from
  // being cleared super quickly, we increase the lifetime of password reset tokens.
  // See https://github.com/meteor/meteor/issues/7794#issuecomment-270253106
  // If Meteor fixes the problem described in that comment, we can remove this.
  passwordResetTokenExpirationInDays: 30,
  // We include these fields only because upstream declares these as required
  // in their type signatures.  They should probably be made optional.
  argon2TimeCost: undefined,
  argon2MemoryCost: undefined,
  argon2Parallelism: undefined,
});
