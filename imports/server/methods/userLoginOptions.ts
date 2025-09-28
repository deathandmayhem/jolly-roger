import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import InvitationCodes from "../../lib/models/InvitationCodes";
import type { UserLoginOptionsResult } from "../../methods/userLoginOptions";
import userLoginOptions from "../../methods/userLoginOptions";
import defineMethod from "./defineMethod";

defineMethod(userLoginOptions, {
  validate(arg) {
    check(arg, {
      email: String,
      invitationCode: String,
    });
    return arg;
  },

  async run({ email, invitationCode }): Promise<UserLoginOptionsResult> {
    // We *do not* require a logged-in user to make this query, as it is intended to assist users who are not logged in figure out how to best do so.
    // We *do* require a valid invitation code that we intend to redeem.
    const invitation = await InvitationCodes.findOneAsync({
      code: invitationCode,
    });
    if (!invitation) {
      throw new Meteor.Error(404, "Invalid invitation code");
    }

    const userWithEmail = await Accounts.findUserByEmail(email);
    if (userWithEmail) {
      const loginMethods = [];
      if (userWithEmail?.services?.password?.bcrypt) {
        loginMethods.push("password");
      }
      if (userWithEmail.googleAccountId) {
        loginMethods.push("google");
      }
      return {
        exists: true,
        loginMethods,
      };
    } else {
      return { exists: false };
    }
  },
});
