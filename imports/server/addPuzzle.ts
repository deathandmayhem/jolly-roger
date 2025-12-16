import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Flags from "../Flags";
import Logger from "../Logger";
import type { GdriveMimeTypesType } from "../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../lib/GdriveMimeTypes";
import Hunts from "../lib/models/Hunts";
import MeteorUsers from "../lib/models/MeteorUsers";
import Puzzles from "../lib/models/Puzzles";
import { userMayWritePuzzlesForHunt } from "../lib/permission_stubs";
import GlobalHooks from "./GlobalHooks";
import { ensureDocument } from "./gdrive";
import getOrCreateTagByName from "./getOrCreateTagByName";
import GoogleClient from "./googleClientRefresher";
import withLock from "./withLock";

async function checkForDuplicatePuzzle(huntId: string, url: string) {
  const existingPuzzleWithUrl = await Puzzles.findOneAsync({
    hunt: huntId,
    url,
  });
  if (existingPuzzleWithUrl) {
    throw new Meteor.Error(409, `Puzzle with URL ${url} already exists`);
  }
}

async function createDocumentAndInsertPuzzle(
  huntId: string,
  title: string,
  expectedAnswerCount: number,
  tags: string[],
  url: string | undefined,
  docType: GdriveMimeTypesType,
): Promise<string> {
  // Look up each tag by name and map them to tag IDs.
  const tagIds = await Promise.all(
    tags.map(async (tagName) => {
      return getOrCreateTagByName(huntId, tagName);
    }),
  );

  const fullPuzzle = {
    hunt: huntId,
    title,
    expectedAnswerCount,
    _id: Random.id(),
    tags: [...new Set(tagIds)],
    answers: [],
    url,
  };

  // By creating the document before we save the puzzle, we make sure nobody
  // else has a chance to create a document with the wrong config. (This
  // requires us to have an _id for the puzzle, which is why we generate it
  // manually above instead of letting Meteor do it)
  if (GoogleClient.ready() && !(await Flags.activeAsync("disable.google"))) {
    await ensureDocument(fullPuzzle, docType);
  }

  await Puzzles.insertAsync(fullPuzzle);
  return fullPuzzle._id;
}

export default async function addPuzzle({
  huntId,
  title,
  tags,
  expectedAnswerCount,
  docType,
  url,
  allowDuplicateUrls,
}: {
  huntId: string;
  title: string;
  url?: string;
  tags: string[];
  expectedAnswerCount: number;
  docType: GdriveMimeTypesType;
  allowDuplicateUrls?: boolean;
}) {
  const userId = Meteor.userId();

  check(userId, String);
  check(huntId, String);
  check(url, Match.Optional(String));
  check(tags, [String]);
  check(expectedAnswerCount, Number);
  check(
    docType,
    Match.OneOf(...(Object.keys(GdriveMimeTypes) as GdriveMimeTypesType[])),
  );
  check(allowDuplicateUrls, Match.Optional(Boolean));

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    throw new Meteor.Error(404, "Unknown hunt id");
  }

  if (
    !userMayWritePuzzlesForHunt(await MeteorUsers.findOneAsync(userId), hunt)
  ) {
    throw new Meteor.Error(
      401,
      `User ${userId} may not create new puzzles for hunt ${huntId}`,
    );
  }

  // Before we do any writes, try an opportunistic check for duplicates. If a
  // puzzle with this URL already exists, we can short-circuit without
  // creating tags or the Google Doc. We'll still need to repeat this check
  // with the lock held.
  if (url && !allowDuplicateUrls) {
    await checkForDuplicatePuzzle(huntId, url);
  }

  Logger.info("Creating a new puzzle", {
    hunt: huntId,
    title,
  });

  let puzzleId = "";
  if (!url) {
    puzzleId = await createDocumentAndInsertPuzzle(
      huntId,
      title,
      expectedAnswerCount,
      tags,
      url,
      docType,
    );
  } else {
    // With a lock, look for a puzzle with the same URL. If present, we reject the insertion
    // unless the client overrides it.
    await withLock(`hunts:${huntId}:puzzle-url:${url}`, async () => {
      if (!allowDuplicateUrls) {
        await checkForDuplicatePuzzle(huntId, url);
      }
      puzzleId = await createDocumentAndInsertPuzzle(
        huntId,
        title,
        expectedAnswerCount,
        tags,
        url,
        docType,
      );
    });
  }

  // Run any puzzle-creation hooks, like creating a default document
  // attachment or announcing the puzzle to Slack.
  Meteor.defer(
    Meteor.bindEnvironment(() => {
      void GlobalHooks.runPuzzleCreatedHooks(puzzleId);
    }),
  );

  return puzzleId;
}
