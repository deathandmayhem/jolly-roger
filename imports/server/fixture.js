import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import huntFixtures from '../fixtures.js';
import Hunts from '../lib/models/hunts.js';
import Puzzles from '../lib/models/puzzles.js';
import Tags from '../lib/models/tags.js';

Meteor.methods({
  createFixtureHunt() {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'mongo.hunts.insert');

    const huntId = 'cSB2bWf3BToQ9NBju'; // fixture hunt id
    const data = huntFixtures[huntId];

    // Create hunt if it doesn't exist.
    const hunt = Hunts.findOne(huntId);
    if (!hunt) {
      Hunts.insert({
        _id: huntId,
        name: data.title,
        openSignups: true,
      });
    }

    // Create tags associated with the hunt.
    data.tags.forEach((tag) => {
      Tags.upsert({
        _id: tag._id,
      }, {
        $set: {
          hunt: huntId,
          name: tag.name,
        },
      });
    });

    // Create puzzles associated with the hunt.  Don't bother running the puzzle hooks.
    data.puzzles.forEach((puzzle) => {
      Puzzles.upsert({
        _id: puzzle._id,
      }, {
        $set: {
          hunt: huntId,
          tags: puzzle.tags,
          title: puzzle.title,
          url: puzzle.url,
          answer: puzzle.answer,
        },
      });
    });
  },
});
