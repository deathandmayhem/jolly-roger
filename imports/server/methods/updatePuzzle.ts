import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Ansible from '../../Ansible';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import updatePuzzle from '../../methods/updatePuzzle';
import { ensureDocument, renameDocument } from '../gdrive';
import getOrCreateTagByName from '../getOrCreateTagByName';
import getTeamName from '../getTeamName';

updatePuzzle.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      title: String,
      url: Match.Optional(String),
      tags: [String],
      expectedAnswerCount: Number,
    });

    return arg;
  },

  async run({
    puzzleId, title, url, tags, expectedAnswerCount,
  }) {
    check(this.userId, String);

    const oldPuzzle = await Puzzles.findOneAllowingDeletedAsync(puzzleId);
    if (!oldPuzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    const hunt = await Hunts.findOneAsync(oldPuzzle.hunt);
    if (!userMayWritePuzzlesForHunt(await MeteorUsers.findOneAsync(this.userId), hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${oldPuzzle.hunt}`
      );
    }

    // Look up each tag by name and map them to tag IDs.
    const tagIds = await Promise.all(tags.map(async (tagName) => {
      return (await getOrCreateTagByName(oldPuzzle.hunt, tagName))._id;
    }));

    Ansible.log('Updating a puzzle', {
      hunt: oldPuzzle.hunt,
      puzzle: puzzleId,
      title,
      expectedAnswerCount,
      user: this.userId,
    });

    const update: Mongo.Modifier<PuzzleType> = {
      $set: {
        title,
        expectedAnswerCount,
        tags: [...new Set(tagIds)],
      },
    };
    if (url) {
      update.$set!.url = url;
    } else {
      update.$unset = { url: '' };
    }
    await Puzzles.updateAsync(puzzleId, update);

    if (oldPuzzle.title !== title) {
      Meteor.defer(Meteor.bindEnvironment(async () => {
        const doc = await ensureDocument({ _id: puzzleId, title, hunt: oldPuzzle.hunt });
        const teamName = await getTeamName();
        await renameDocument(doc.value.id, `${title}: ${teamName}`);
      }));
    }
  },
});
