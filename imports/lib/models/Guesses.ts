import { z } from "zod";
import { answer, foreignKey, nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

// The state of this guess, as handled by the operators:
// * 'pending' means "shows up in the operator queue"
// * "intermediate", "correct", "incorrect", and "rejected" all mean "no longer
//   in the operator queue"
// * 'incorrect' and 'intermediate' answers should be listed or at least
//   discoverable on the puzzle page
// * 'correct' answers should be accompanied by an update to the corresponding
//   puzzle's answer field.
export const GuessStates = z.enum([
  "pending",
  "intermediate",
  "correct",
  "incorrect",
  "rejected",
]);

const Guess = withCommon(
  z.object({
    // Denormalized in so subscriptions can filter on hunt without having to join on Puzzles
    hunt: foreignKey,
    // The puzzle this guess is for.
    puzzle: foreignKey,
    // The text of this guess.
    guess: answer,
    // Whether this was forward solved (10), backwards solved (-10), or somewhere
    // in between (only optional in that older hunts won't have it)
    direction: z.number().int().min(-10).max(10).optional(),
    // Submitted-evaluated probability that the answer is right (also only
    // optional on older hunts)
    confidence: z.number().int().min(0).max(100).optional(),
    state: GuessStates,
    // Additional notes can be used by the operator either for sharing (e.g.)
    // additional information received from the puzzle (e.g. for an intermediate
    // instruction) or why a guess was rejected.
    additionalNotes: nonEmptyString.optional(),
  }),
);

const Guesses = new SoftDeletedModel("jr_guesses", Guess);
Guesses.addIndex({ deleted: 1, hunt: 1, puzzle: 1 });
Guesses.addIndex({ deleted: 1, state: 1 });
export type GuessType = ModelType<typeof Guesses>;

export default Guesses;
