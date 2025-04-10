import { Mongo } from "meteor/mongo";

export interface PuzzleHistoryItem {
  _id: string; // This is the puzzleId
  userId: string;
  puzzleId: string;
  name: string;
  url?: string;
  huntId: string;
  huntName: string;
  firstInteraction: Date | null;
  lastInteraction: Date | null;
  interactionCount: number;
  bookmarkCounter: number;
  callCounter: number;
  chatCounter: number;
  documentCounter: number;
  guessCounter: number;
  correctGuessCounter: number;
  solvedness: string;
  answers: string[];
  tags: string[];
}

// Define the client-side collection to receive the aggregated data
// The name 'client.userPuzzleHistory' must match the first argument to `this.added` in the publication
export const UserPuzzleHistoryCollection =
  new Mongo.Collection<PuzzleHistoryItem>("client.userPuzzleHistory");
