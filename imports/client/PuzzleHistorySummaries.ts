import { Mongo } from "meteor/mongo";
import type { PuzzleHistoryItem } from "./UserPuzzleHistory";

export default new Mongo.Collection<PuzzleHistoryItem>(
  "puzzleHistorySummaries",
);
