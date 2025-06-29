import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Hunts from "../lib/models/Hunts";
import MeteorUsers from "../lib/models/MeteorUsers";
import Puzzles from "../lib/models/Puzzles";

export async function findPuzzle({
  userId,
  huntId,
  url,
}: {
  userId: string;
  huntId: string;
  url: string;
}) {
  check(userId, String);
  check(huntId, String);
  check(url, String);

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    throw new Meteor.Error(404, "Unknown hunt id");
  }

  const user = await MeteorUsers.findOneAsync(userId);
  if (!user) {
    throw new Meteor.Error(401, "Unauthorized");
  }

  const puzzlesFound = await Puzzles.find({ url, hunt: huntId }).fetchAsync();

  if (puzzlesFound.length === 0) {
    // throw new Meteor.Error(404, "No puzzles found with that URL in this hunt.");
    return [];
  }

  return puzzlesFound;
}

export async function findPuzzlesBulk({
  userId,
  huntId,
  urls,
}: {
  userId: string;
  huntId: string;
  urls: string[];
}) {
  check(userId, String);
  check(huntId, String);
  check(urls, [String]);

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    throw new Meteor.Error(404, "Unknown hunt id");
  }

  const user = await MeteorUsers.findOneAsync(userId);
  if (!user) {
    throw new Meteor.Error(401, "Unauthorized");
  }

  const existingPuzzles = await Puzzles.find(
    { hunt: huntId, url: { $in: urls } },
    { fields: { _id: 1, url: 1 } },
  ).fetchAsync();

  const jollyRogerInstance =
    Meteor.settings.public.jollyRogerUrl || Meteor.absoluteUrl();

  const existingMap: Record<string, string> = {};
  for (const puzzle of existingPuzzles) {
    const puzzleUrl = new URL(
      `/hunts/${huntId}/puzzles/${puzzle._id}`,
      jollyRogerInstance,
    );
    existingMap[puzzle.url] = puzzleUrl.href;
  }

  return existingMap;
}
