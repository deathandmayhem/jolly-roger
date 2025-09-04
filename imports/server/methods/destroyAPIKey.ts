import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import APIKeys from "../../lib/models/APIKeys";
import destroyAPIKey from "../../methods/destroyAPIKey";
import userForKeyOperation from "../userForKeyOperation";
import defineMethod from "./defineMethod";

defineMethod(destroyAPIKey, {
  validate(arg) {
    check(arg, { apiKeyId: String });
    return arg;
  },

  async run({ apiKeyId, forUser }) {
    check(this.userId, String);

    const user = await userForKeyOperation(this.userId, forUser);

    const apiKey = await APIKeys.findOneAsync({
      _id: apiKeyId,
      user,
    });

    if (!apiKey) {
      throw new Meteor.Error(403, `No API key owned by with id ${apiKeyId}`);
    }

    await APIKeys.destroyAsync({ _id: apiKey._id });
  },
});
