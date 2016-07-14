import { Accounts } from 'meteor/accounts-base';

Accounts.config({
  forbidClientAccountCreation: true,
  sendVerificationEmail: true,
});
