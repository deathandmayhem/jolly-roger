import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import Flags from '../../Flags';
import Logger from '../../Logger';
import type { GdriveMimeTypesType } from '../../lib/GdriveMimeTypes';
import GdriveMimeTypes from '../../lib/GdriveMimeTypes';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import createPuzzle from '../../methods/createPuzzle';
import GlobalHooks from '../GlobalHooks';
import { ensureDocument } from '../gdrive';
import getOrCreateTagByName from '../getOrCreateTagByName';
import GoogleClient from '../googleClientRefresher';
import defineMethod from './defineMethod';

defineMethod(createPuzzle, {
  validate(arg) {
    check(arg, {
      huntId: String,
      title: String,
      url: Match.Optional(String),
      tags: [String],
      expectedAnswerCount: Number,
      docType: Match.OneOf(...Object.keys(GdriveMimeTypes) as GdriveMimeTypesType[]),
    });
    return arg;
  },

  async run({
    huntId, title, tags, expectedAnswerCount, docType, url,
  }) {
    check(this.userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt id');
    }

    if (!userMayWritePuzzlesForHunt(await MeteorUsers.findOneAsync(this.userId), hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not create new puzzles for hunt ${huntId}`
      );
    }

    // Look up each tag by name and map them to tag IDs.
    const tagIds = await Promise.all(tags.map(async (tagName) => {
      return (await getOrCreateTagByName(huntId, tagName))._id;
    }));

    Logger.info('Creating a new puzzle', {
      hunt: huntId,
      title,
    });

    const fullPuzzle = {
      hunt: huntId,
      title,
      expectedAnswerCount,
      _id: Random.id(),
      tags: [...new Set(tagIds)],
      answers: [],
      url,
    };

    // By creating the document before we save the puzzle, we make sure nobody
    // else has a chance to create a document with the wrong config. (This
    // requires us to have an _id for the puzzle, which is why we generate it
    // manually above instead of letting Meteor do it)
    if (GoogleClient.ready() && !Flags.active('disable.google')) {
      await ensureDocument(fullPuzzle, docType);
    }

    await Puzzles.insertAsync(fullPuzzle);

    // Run any puzzle-creation hooks, like creating a default document
    // attachment or announcing the puzzle to Slack.
    Meteor.defer(Meteor.bindEnvironment(() => {
      void GlobalHooks.runPuzzleCreatedHooks(fullPuzzle._id);
    }));

    return fullPuzzle._id;
  },
});
