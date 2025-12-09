import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import createChatImageUpload from "../../methods/createChatImageUpload";
import getS3UploadParams from "../getS3UploadParams";
import defineMethod from "./defineMethod";

defineMethod(createChatImageUpload, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      mimeType: String,
    });

    return arg;
  },

  async run({ puzzleId, mimeType }) {
    check(this.userId, String);

    if (!mimeType.startsWith("image/")) {
      throw new Meteor.Error(403, "Only image files can be uploaded in chat.");
    }

    const user = (await MeteorUsers.findOneAsync(this.userId))!;

    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, "Puzzle not found");
    }

    if (!user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(403, "User is not a member of this hunt");
    }

    const key = `${puzzle.hunt}/${puzzleId}/${Random.id()}`;

    return getS3UploadParams(key, mimeType);
  },
});
