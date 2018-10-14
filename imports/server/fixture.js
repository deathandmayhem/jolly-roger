import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import huntFixtures from '/imports/fixtures.js';

Meteor.methods({
  createFixtureHunt() {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'mongo.hunts.insert');

    const huntId = 'cSB2bWf3BToQ9NBju'; // fixture hunt id
    const data = huntFixtures[huntId];

    // Create hunt if it doesn't exist.
    const hunt = Models.Hunts.findOne(huntId);
    if (!hunt) {
      Models.Hunts.insert({
        _id: huntId,
        name: data.title,
        openSignups: true,
      });
    }

    // Create tags associated with the hunt.
    data.tags.forEach(tag => {
      Models.Tags.upsert({
        _id: tag._id,
      }, {
        $set: {
          hunt: huntId,
          name: tag.name,
        },
      });
    });

    // Create puzzles associated with the hunt.  Don't bother running the puzzle hooks.
    data.puzzles.forEach(puzzle => {
      Models.Puzzles.upsert({
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
