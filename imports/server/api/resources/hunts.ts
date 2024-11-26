import { check } from "meteor/check";
import express from "express";
import type { HuntType } from "../../../lib/models/Hunts";
import Hunts from "../../../lib/models/Hunts";
import MeteorUsers from "../../../lib/models/MeteorUsers";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const hunts = express.Router();

const renderHunt = function renderHunt(hunt: HuntType) {
  return {
    _id: hunt._id,
    name: hunt.name,
  };
};

hunts.get(
  "/",
  expressAsyncWrapper(async (_, res) => {
    check(res.locals.userId, String);

    const user = await MeteorUsers.findOneAsync({ _id: res.locals.userId });
    if (!user) {
      // Should never happen if the API key passed authentication.
      res.sendStatus(500);
      return;
    }

    const allHunts = Hunts.find({}, { sort: { createdAt: -1 } });
    const userHunts = [];
    for await (const hunt of allHunts) {
      if (user.hunts?.includes(hunt._id)) {
        userHunts.push(renderHunt(hunt));
      }
    }
    res.json({
      hunts: userHunts,
    });
  }),
);

export default hunts;
