import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import Mustache from 'mustache';
import { HuntType } from './lib/schemas/hunts';
import { PuzzleType } from './lib/schemas/puzzles';

const answerify = function (answer: string): string {
  return answer
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
};

interface HuntModel {
  hunt: string;
}

const huntsMatchingCurrentUser = function <T extends HuntModel> (
  this: Subscription,
  origQuery: Mongo.Query<T>,
): Mongo.Query<T> {
  // Adds a filter to the query to only show results from hunts that the user is a member of.
  // Assumes the collection being published has a field named `hunt` of type String containing the
  // _id of a document from the Hunts collection.
  // The caller binds `this` to be the one provided to the function of Meteor.publish(), so
  // this.userId is available.
  //
  // As a note: this will not re-publish if the user's hunt membership
  // changes, so use it carefully (basically, use it when you already
  // know the user is a member of the hunt in question).
  const u = Meteor.users.findOne(this.userId);
  if (!u) {
    throw new Meteor.Error(401, 'Unauthenticated');
  }
  const q = _.clone(origQuery);
  let huntList: T['hunt'][];

  if (q.hunt) {
    if (q.hunt instanceof RegExp) {
      // stop your shenanigans
      huntList = u.hunts;
    } else if (typeof q.hunt === 'object') {
      // if q.hunt is still an object, then it must be a FieldExpression
      huntList = _.intersection(u.hunts, q.hunt.$in || []);
    } else {
      // otherwise it's a string
      huntList = _.intersection(u.hunts, [q.hunt]);
    }
  } else {
    huntList = u.hunts;
  }

  // typescript comes so close to being able to infer this, but seems to
  // struggle with the generic constraint + Mongo.Flatten
  q.hunt = <Mongo.FieldExpression<Mongo.Flatten<T['hunt']>>>{ $in: huntList };

  return q;
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
