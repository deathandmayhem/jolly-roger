import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import bodyParser from "body-parser";
import express from "express";
import type { GdriveMimeTypesType } from "../../../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../../../lib/GdriveMimeTypes";
import addPuzzle from "../../addPuzzle";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const createPuzzle = express.Router();

createPuzzle.use(bodyParser.json());

createPuzzle.post(
  "/:huntId",
  expressAsyncWrapper(async (req, res) => {
    check(req.params.huntId, String);
    check(res.locals.userId, String);
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
        userId: res.locals.userId,
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

export default createPuzzle;
