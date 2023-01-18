import { Meteor } from 'meteor/meteor';
import type { Mongo } from 'meteor/mongo';
import Mustache from 'mustache';
import MeteorUsers from './lib/models/MeteorUsers';
import type { HuntType } from './lib/schemas/Hunt';
import type { PuzzleType } from './lib/schemas/Puzzle';

const answerify = function (answer: string): string {
  return answer.toUpperCase();
};

interface HuntModel {
  hunt: string;
}

const huntsMatchingCurrentUser = function <T extends HuntModel> (
  userId: string,
): Mongo.Query<T> {
  // Returns an additional query filter to only show results from hunts that the
  // user is a member of. Assumes the collection being published has a field
  // named `hunt` of type String containing the _id of a document from the Hunts
  // collection.
  //
  // As a note: this will not re-publish if the user's hunt membership changes,
  // so use it carefully (basically, use it when you already know the user is a
  // member of the hunt in question).
  const u = MeteorUsers.findOne(userId);
  if (!u) {
    throw new Meteor.Error(401, 'Unauthenticated');
  }

  // Typescript comes close to getting this right. It seems to be able to tell
  // that T['hunt'] must be a string, but can't infer that
  // Mongo.Flatten<T['hunt']> must also be a string.
  return { hunt: { $in: u.hunts } } as Mongo.Query<T>;
};

const guessURL = function (hunt: HuntType, puzzle: PuzzleType): string {
  if (!puzzle.url) {
    return '';
  }

  if (!hunt.submitTemplate) {
    return puzzle.url;
  }

  const url = new URL(puzzle.url);
  return Mustache.render(hunt.submitTemplate, url);
};

export { answerify, huntsMatchingCurrentUser, guessURL };
