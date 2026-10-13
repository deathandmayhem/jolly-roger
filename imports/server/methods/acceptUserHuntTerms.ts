import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import acceptUserHuntTerms from "../../methods/acceptUserHuntTerms";
import defineMethod from "./defineMethod";

defineMethod(acceptUserHuntTerms, {
  async run({ huntId }) {
    check(this.userId, String);
    await MeteorUsers.updateAsync(this.userId, {
      $set: { [`huntTermsAcceptedAt.${huntId}`]: new Date() },
    });
  },
});
