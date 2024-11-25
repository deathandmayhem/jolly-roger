import { check } from "meteor/check";
import Tags from "../../lib/models/Tags";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import destroyTag from "../../methods/destroyTag";
import defineMethod from "./defineMethod";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Hunts from "../../lib/models/Hunts";
import { Meteor } from "meteor/meteor";

defineMethod(destroyTag, {
  validate(arg) {
    check(arg, { tagId: String });
    return arg;
  },

  async run({ tagId }) {
    check(this.userId, String);

    const tag = await Tags.findOneAsync(tagId);
    if(!tag) {
      throw new Meteor.Error(404, "Unknown tag id");
    }

    if (!userMayWritePuzzlesForHunt(
      await MeteorUsers.findOneAsync(this.userId),
      await Hunts.findOneAsync(tag.hunt),
    )
  ) {
    throw new Meteor.Error(
      401,
      `User ${this.userId} may not modify tags from hunt ${tag.hunt}`,
    )
  }

    await Tags.updateAsync(tagId, {
      $set: {
        deleted: true,
      }
    });
  },
});
