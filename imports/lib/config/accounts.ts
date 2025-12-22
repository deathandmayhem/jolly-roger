import { Accounts } from "meteor/accounts-base";

Accounts.config({
  forbidClientAccountCreation: true,
  sendVerificationEmail: true,
  // We include these fields only because upstream declares these as required
  // in their type signatures.  They should probably be made optional.
  argon2TimeCost: undefined,
  argon2MemoryCost: undefined,
  argon2Parallelism: undefined,
});
