import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import isAdmin from "../../lib/isAdmin";
import Bookmarks from "../../lib/models/Bookmarks";
import ChatMessages from "../../lib/models/ChatMessages";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Guesses from "../../lib/models/Guesses";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import puzzleHistoryForUser from "../../lib/publications/puzzleHistoryForUser";
import CallActivities from "../models/CallActivities";
import definePublication from "./definePublication";

definePublication(puzzleHistoryForUser, {
  validate(arg) {
    check(arg, {
      userId: String,
      puzzleId: String,
    });
    return arg;
  },

  async run({ userId, puzzleId }) {
    if (!this.userId || this.userId !== userId) {
      return [];
    }

    const user = await Meteor.userAsync();
    const puzzle = puzzleId;

    if (userId !== user?._id && !isAdmin(user)) {
      return [];
    }

    const userHunts = Array.from(new Set(user?.hunts));

    const bookmarks = Bookmarks.find({
      user: userId,
      hunt: { $in: userHunts },
      puzzle,
    });
    const callActivities = CallActivities.find({
      user: userId,
      hunt: { $in: userHunts },
      room: puzzleId,
    });
    const chatMessages = ChatMessages.find({
      $or: [{ sender: userId }, { "content.children.userId": userId }],
      hunt: { $in: userHunts },
      puzzle,
    });
    const documentActivities = DocumentActivities.find({
      user: userId,
      hunt: { $in: userHunts },
      puzzle,
    });

    const puzzles = Puzzles.find({
      _id: puzzle,
      hunt: { $in: userHunts },
    });

    const allTagIds = (await puzzles.mapAsync((p) => p.tags)).flat();

    const guesses = Guesses.find({
      puzzle,
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
    ];
  },
});
