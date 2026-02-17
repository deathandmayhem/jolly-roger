import type { FixtureHuntType } from "../FixtureHunt";
import Guesses from "../lib/models/Guesses";
import Hunts from "../lib/models/Hunts";
import Puzzles from "../lib/models/Puzzles";
import Tags from "../lib/models/Tags";

export default async function makeFixtureHunt(
  createdBy: string,
  fixtureHunt: FixtureHuntType,
) {
  const huntId = fixtureHunt._id; // fixture hunt id

  // Create hunt if it doesn't exist.
  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    await Hunts.insertAsync({
      _id: huntId,
      name: fixtureHunt.name,
      openSignups: true,
      hasGuessQueue: true,
      createdBy,
    });
  }

  // Create tags
  for (const { _id, name } of fixtureHunt.tags) {
    await Tags.upsertAsync(
      { _id },
      {
        $setOnInsert: { createdBy },
        $set: {
          hunt: huntId,
          name,
        },
      },
    );
  }

  // Create puzzles associated with the hunt.  Don't bother running the puzzle hooks.
  for (const puzzle of fixtureHunt.puzzles) {
    await Puzzles.upsertAsync(
      {
        _id: puzzle._id,
      },
      {
        $setOnInsert: { createdBy },
        $set: {
          hunt: huntId,
          title: puzzle.title,
          url: puzzle.url,
          expectedAnswerCount: puzzle.expectedAnswerCount,
          tags: puzzle.tags,
          answers: puzzle.guesses
            .filter((g) => g.state === "correct")
            .map((g) => g.guess),
        },
      },
    );

    for (const g of puzzle.guesses) {
      await Guesses.upsertAsync(
        { _id: g._id },
        {
          $setOnInsert: { createdBy },
          $set: {
            hunt: huntId,
            puzzle: puzzle._id,
            guess: g.guess,
            state: g.state,
            direction: 10,
            confidence: 100,
            additionalNotes: g.additionalNotes,
          },
        },
      );
    }
  }
}
