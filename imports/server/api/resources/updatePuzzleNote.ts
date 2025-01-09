import { check, Match } from "meteor/check";
import bodyParser from "body-parser";
import express from "express";
import Documents from "../../../lib/models/Documents";
import Puzzles from "../../../lib/models/Puzzles";
import expressAsyncWrapper from "../../expressAsyncWrapper";

const updatePuzzleNote = express.Router();

updatePuzzleNote.use(bodyParser.json());

updatePuzzleNote.post(
  "/:huntId/:documentId",
  expressAsyncWrapper(async (req, res) => {
    check(req.params.huntId, String);
    check(req.params.documentId, String);
    check(req.body, {
      flavor: Match.Optional(String),
      flavorMeanings: Match.Optional([[String]]),
      summary: Match.Optional(String),
      keywords: Match.Optional([String]),
      theories: Match.Optional(String),
      contactPerson: Match.Optional(String),
      externalLinkText: Match.Optional(String),
      externalLinkUrl: Match.Optional(String),
    });
    const huntId = req.params.huntId;
    const docId = req.params.documentId;
    const doc = await Documents.findOneAsync({
      hunt: huntId,
      "value.id": docId,
    });
    if (!doc) {
      res.sendStatus(404);
      return;
    }

    const now = new Date();
    const puzzleId = doc.puzzle;
    const puzzle = await Puzzles.updateAsync(
      { _id: puzzleId, hunt: huntId },
      { $set: { noteContent: req.body, noteUpdateTs: now } },
    );

    if (!puzzle) {
      res.sendStatus(404);
      return;
    }

    res.json({
      status: "success",
    });
  }),
);

export default updatePuzzleNote;
