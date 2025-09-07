import { check } from "meteor/check";
import { Random } from "meteor/random";
import APIKeys from "../../lib/models/APIKeys";
import createAPIKey from "../../methods/createAPIKey";
import defineMethod from "./defineMethod";

defineMethod(createAPIKey, {
  validate(arg) {
    check(arg, {});
    return arg;
  },

  async run() {
    check(this.userId, String);

    const key = await APIKeys.insertAsync({
      user: this.userId,
      key: Random.id(32),
    });

    return key;
  },
});
