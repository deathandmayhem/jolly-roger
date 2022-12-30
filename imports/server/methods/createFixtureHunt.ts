import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import FixtureHunt from '../../FixtureHunt';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import { addUserToRole, userMayCreateHunt } from '../../lib/permission_stubs';
import createFixtureHunt from '../../methods/createFixtureHunt';

createFixtureHunt.define({
  async run() {
    check(this.userId, String);

    if (!userMayCreateHunt(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, 'Must be allowed to create hunt');
    }

    const huntId = FixtureHunt._id; // fixture hunt id

    // Create hunt if it doesn't exist.
    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      await Hunts.insertAsync({
        _id: huntId,
        name: FixtureHunt.name,
        openSignups: true,
        hasGuessQueue: true,
      });
    }

    // Make the user an operator
    await MeteorUsers.updateAsync(this.userId, { $addToSet: { hunts: huntId } });
    await addUserToRole(this.userId, huntId, 'operator');

    // Create tags
    await FixtureHunt.tags.reduce(async (p, { _id, name }) => {
      await p;
      await Tags.upsertAsync({ _id }, {
        $set: {
          hunt: huntId,
          name,
        },
      });
    }, Promise.resolve());

    // Create puzzles associated with the hunt.  Don't bother running the puzzle hooks.
    await FixtureHunt.puzzles.reduce(async (p, puzzle) => {
      await p;
      await Puzzles.upsertAsync({
        _id: puzzle._id,
      }, {
        $set: {
          hunt: huntId,
          title: puzzle.title,
          url: puzzle.url,
          expectedAnswerCount: puzzle.expectedAnswerCount,
          tags: puzzle.tags,
          answers: puzzle.guesses.filter((g) => g.state === 'correct').map((g) => g.guess),
        },
      });

      await puzzle.guesses.reduce(async (gp, g) => {
        await gp;
        await Guesses.upsertAsync({ _id: g._id }, {
          $set: {
            hunt: huntId,
            puzzle: puzzle._id,
            guess: g.guess,
            state: g.state,
            direction: 10,
            confidence: 100,
            additionalNotes: g.additionalNotes,
          },
        });
      }, Promise.resolve());
    }, Promise.resolve());
  },
});
