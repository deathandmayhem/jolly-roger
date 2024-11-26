import { check } from "meteor/check";
import express from "express";
import MeteorUsers from "../../../lib/models/MeteorUsers";
import Tags from "../../../lib/models/Tags";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const tags = express.Router();

tags.get(
  "/:huntId",
  expressAsyncWrapper(async (req, res) => {
    check(req.params.huntId, String);
    check(res.locals.userId, String);

    const user = await MeteorUsers.findOneAsync({ _id: res.locals.userId });
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
      tags: await huntTags.mapAsync((tag) => tag.name),
    });
  }),
);

export default tags;
