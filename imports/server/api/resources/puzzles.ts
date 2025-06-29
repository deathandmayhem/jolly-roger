import { Meteor } from "meteor/meteor";
import bodyParser from "body-parser";
import express from "express";
import Logger from "../../../Logger";
import { findPuzzle, findPuzzlesBulk } from "../../findPuzzles";

const puzzles = express.Router();

puzzles.use(bodyParser.json());

// GET /api/puzzles?url=...&hunt=...
// Finds puzzles with a specific URL within a given hunt.
puzzles.get("/", (req, res, next) => {
  try {
    const { url, hunt } = req.query;

    if (typeof url !== "string" || typeof hunt !== "string") {
      res.status(400).json({ error: "URL and hunt ID are required." });
      return;
    }

    // Assumes authentication is handled by a prior middleware that populates res.locals.userId
    if (!res.locals.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    void (async () => {
      const puzzlesFound = await findPuzzle({
        userId: res.locals.userId,
        huntId: hunt,
        url,
      });

      res.json({ puzzles: puzzlesFound });
    })();
  } catch (err) {
    if (err instanceof Meteor.Error && err.error === 404) {
      // Return 404 if no puzzles are found, as expected by the client-side logic.
      res.status(404).json({ error: err.reason });
    } else {
      Logger.error("Error in puzzle lookup", { err });
      next(err);
    }
  }
});

// POST /api/puzzles/bulk-check
// Checks a list of URLs and returns a map of those that already exist.
puzzles.post("/bulk-check", (req, res, next) => {
  try {
    const { urls, hunt } = req.body;

    if (!Array.isArray(urls) || typeof hunt !== "string") {
      res
        .status(400)
        .json({ error: "An array of 'urls' and a 'hunt' ID are required." });
      return;
    }

    if (!res.locals.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    void (async () => {
      const existingMap = await findPuzzlesBulk({
        userId: res.locals.userId,
        huntId: hunt,
        urls,
      });

      res.json({ existing: existingMap });
    })();
  } catch (err) {
    Logger.error("Error in puzzle bulk-check", { err });
    next(err);
  }
});

export default puzzles;
