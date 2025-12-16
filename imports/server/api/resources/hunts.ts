import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import bodyParser from "body-parser";
import express from "express";
import type { GdriveMimeTypesType } from "../../../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../../../lib/GdriveMimeTypes";
import type { HuntType } from "../../../lib/models/Hunts";
import Hunts from "../../../lib/models/Hunts";
import MeteorUsers from "../../../lib/models/MeteorUsers";
import type { TagType } from "../../../lib/models/Tags";
import Tags from "../../../lib/models/Tags";
import addPuzzle from "../../addPuzzle";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const hunts = express.Router();
hunts.use(bodyParser.json());

// GET /hunts - list all hunts
hunts.get(
  "/",
  expressAsyncWrapper(async (_, res) => {
    const userId = Meteor.userId();
    check(userId, String);

    const user = await MeteorUsers.findOneAsync({ _id: userId });
    if (!user) {
      // Should never happen if the API key passed authentication.
      res.sendStatus(500);
      return;
    }

    const userHunts = await Hunts.find(
      { _id: { $in: user.hunts ?? [] } },
      { sort: { createdAt: -1 } },
    ).mapAsync((hunt) => renderHunt(hunt));
    res.json({
      hunts: userHunts,
    });
  }),
);

// GET /hunts/:huntId/tags - list tags for a hunt
hunts.get(
  "/:huntId/tags",
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

// POST /hunts/:huntId/puzzles - create a new puzzle
hunts.post(
  "/:huntId/puzzles",
  expressAsyncWrapper(async (req, res) => {
    check(req.params.huntId, String);
    check(req.body, {
      title: String,
      url: Match.Optional(String),
      tags: [String],
      expectedAnswerCount: Number,
      docType: Match.OneOf(
        ...(Object.keys(GdriveMimeTypes) as GdriveMimeTypesType[]),
      ),
      allowDuplicateUrls: Match.Optional(Boolean),
    });

    try {
      const id = await addPuzzle({
        huntId: req.params.huntId,
        ...req.body,
      });
      res.json({
        id,
      });
    } catch (error) {
      if (error instanceof Meteor.Error && typeof error.error === "number") {
        res.sendStatus(error.error);
      }
      throw error;
    }
  }),
);

const renderHunt = function renderHunt(hunt: HuntType) {
  return {
    _id: hunt._id,
    name: hunt.name,
  };
};

export default hunts;
