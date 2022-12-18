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
  run() {
    check(this.userId, String);

    if (!userMayCreateHunt(this.userId)) {
      throw new Meteor.Error(401, 'Must be allowed to create hunt');
    }

    const huntId = FixtureHunt._id; // fixture hunt id

    // Create hunt if it doesn't exist.
    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      Hunts.insert({
        _id: huntId,
        name: FixtureHunt.name,
        openSignups: true,
        hasGuessQueue: true,
      });
    }

    // Make the user an operator
    MeteorUsers.update(this.userId, { $addToSet: { hunts: huntId } });
    addUserToRole(this.userId, huntId, 'operator');

    // Create tags
    FixtureHunt.tags.forEach(({ _id, name }) => Tags.upsert({ _id }, {
      $set: {
        hunt: huntId,
        name,
      },
    }));

    // Create puzzles associated with the hunt.  Don't bother running the puzzle hooks.
    FixtureHunt.puzzles.forEach((puzzle) => {
      Puzzles.upsert({
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

      puzzle.guesses.forEach((g) => {
        Guesses.upsert({ _id: g._id }, {
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
      });
    });
  },
});
