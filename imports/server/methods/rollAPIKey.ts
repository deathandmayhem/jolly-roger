import { check, Match } from "meteor/check";
import Logger from "../../Logger";
import APIKeys from "../../lib/models/APIKeys";
import rollAPIKey from "../../methods/rollAPIKey";
import ensureAPIKey from "../ensureAPIKey";
import userForKeyOperation from "../userForKeyOperation";
import defineMethod from "./defineMethod";

defineMethod(rollAPIKey, {
  validate(arg) {
    check(arg, { forUser: Match.Optional(String) });

    return arg;
  },

  async run({ forUser }) {
    check(this.userId, String);

    const user = await userForKeyOperation(this.userId, forUser);

    for await (const k of APIKeys.find({ user })) {
      Logger.info("Expiring API key", {
        id: k._id,
        user: k.user,
        requestedBy: this.userId,
      });
      await APIKeys.destroyAsync(k._id);
    }

    return ensureAPIKey({ requestedBy: this.userId, forUser });
  },
});
