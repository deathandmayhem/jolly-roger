import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import isAdmin from "../../lib/isAdmin";
import Bookmarks from "../../lib/models/Bookmarks";
import ChatMessages from "../../lib/models/ChatMessages";
import Guesses from "../../lib/models/Guesses";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import puzzleHistoryForUser from "../../lib/publications/puzzleHistoryForUser";
import CallActivities from "../models/CallActivities";
import definePublication from "./definePublication";
import Logger from "../../Logger";
import Hunts from "../../lib/models/Hunts";
import DocumentActivities from "../../lib/models/DocumentActivities";

definePublication(puzzleHistoryForUser, {
  validate(arg) {
    check(arg, {
      userId: String,
    });
    return arg;
  },

  async run({ userId }) {
    if (!this.userId) {
      return [];
    }

    const user = await Meteor.userAsync();

    if (userId !== user?._id && !isAdmin(user)) {
      return [];
    }

    const userHunts = Array.from(new Set(user?.hunts));
    const hunts = Hunts.find({ _id: { $in: userHunts } });

    const bookmarks = Bookmarks.find({
      user: userId,
      hunt: { $in: userHunts },
    });
    const callActivities = CallActivities.find({
      user: userId,
      hunt: { $in: userHunts },
    });
    const chatMessages = ChatMessages.find({
      $or: [{ sender: userId }, { "content.children.userId": userId }],
      hunt: { $in: userHunts },
    });
    const documentActivities = DocumentActivities.find({
      user: userId,
      hunt: { $in: userHunts },
    });
    const userGuesses = Guesses.find({
      createdBy: userId,
      hunt: { $in: userHunts },
    });

    const allPuzzleIds: string[] = [
      ...(await bookmarks.fetchAsync()).map((b) => b.hunt),
      ...(await callActivities.fetchAsync()).map((c) => c.call),
      ...(await chatMessages.fetchAsync()).map((c) => c.puzzle),
      ...(await documentActivities.fetchAsync()).map((d) => d.puzzle),
      ...(await userGuesses.fetchAsync()).map((g) => g.puzzle),
    ];

    const puzzles = Puzzles.find({
      _id: { $in: allPuzzleIds },
      hunt: { $in: userHunts },
    });

    const allTagIds = (await puzzles.mapAsync((p) => p.tags)).flat();

    const guesses = Guesses.find({
      $or: [{ puzzle: { $in: allPuzzleIds } }, { createdBy: userId }],
      hunt: { $in: userHunts },
    });

    const tags = Tags.find({
      _id: { $in: allTagIds },
      hunt: { $in: userHunts },
    });

    return [
      chatMessages,
      callActivities,
      documentActivities,
      bookmarks,
      puzzles,
      tags,
      guesses,
      hunts,
    ];
  },
});
