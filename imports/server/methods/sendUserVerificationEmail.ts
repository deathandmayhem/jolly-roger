import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import Logger from "../../Logger";
import sendUserVerificationEmail from "../../methods/sendUserVerificationEmail";
import checkVerificationEmailCooldown from "../checkVerificationEmailCooldown";
import defineMethod from "./defineMethod";

defineMethod(sendUserVerificationEmail, {
  validate(arg) {
    check(arg, { email: String });
    return arg;
  },

  async run({ email }) {
    check(this.userId, String);

    await checkVerificationEmailCooldown(this.userId);

    Logger.info("Sending verification email", {
      user: this.userId,
      email,
    });
    await Accounts.sendVerificationEmail(this.userId, email);
  },
});
