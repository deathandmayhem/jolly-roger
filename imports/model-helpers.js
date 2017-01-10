import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';


const answerify = function (answer) {
  return answer
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
};

const huntsMatchingCurrentUser = function (origQuery) {
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
  let q = _.clone(origQuery);

  if (_.has(q, 'hunt')) {
    if (_.isObject(q.hunt) &&
        _.some(q.hunt, (unused, k) => k.startsWith('$'))) {
      q.hunt.$in = _.intersection(..._.compact([q.hunt.$in, u.hunts]));
    } else {
      q.hunt = { $in: _.intersection([q.hunt], u.hunts) };
    }
  } else {
    q = _.extend(q, { hunt: { $in: u.hunts } });
  }

  return q;
};

export { answerify, huntsMatchingCurrentUser };
