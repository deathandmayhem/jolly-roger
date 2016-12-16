import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Accounts.resetPasswordPromise = Meteor.wrapPromise(Accounts.resetPassword);
Accounts.forgotPasswordPromise = Meteor.wrapPromise(Accounts.forgotPassword);

Meteor.loginWithPasswordPromise = Meteor.wrapPromise(Meteor.loginWithPassword);
