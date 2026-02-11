import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import Logger from "../../Logger";
import addUserAccountEmail from "../../methods/addUserAccountEmail";
import checkVerificationEmailCooldown from "../checkVerificationEmailCooldown";
import defineMethod from "./defineMethod";

defineMethod(addUserAccountEmail, {
  validate(arg) {
    check(arg, { email: String });
    return arg;
  },

  async run({ email }) {
    check(this.userId, String);

    await checkVerificationEmailCooldown(this.userId);

    Logger.info("Adding email to user account", {
      user: this.userId,
      email,
    });
    await Accounts.addEmailAsync(this.userId, email);
    await Accounts.sendVerificationEmail(this.userId, email);
  },
});
