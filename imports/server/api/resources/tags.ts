import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import express from "express";
import MeteorUsers from "../../../lib/models/MeteorUsers";
import Tags from "../../../lib/models/Tags";
import type { TagType } from "../../../lib/models/Tags";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const tags = express.Router();

tags.get(
  "/:huntId",
  expressAsyncWrapper(async (req, res) => {
    const userId = Meteor.userId();

    check(userId, String);
    check(req.params.huntId, String);

    const user = await MeteorUsers.findOneAsync({ _id: userId });
    if (!user) {
      // Should never happen if the API key passed authentication.
      res.sendStatus(500);
      return;
    }

    if (!user.hunts?.includes(req.params.huntId)) {
      res.sendStatus(403);
      return;
    }

    const huntTags = Tags.find({ hunt: req.params.huntId });
    res.json({
      tags: await huntTags.mapAsync((tag: TagType) => tag.name),
    });
  }),
);

export default tags;
