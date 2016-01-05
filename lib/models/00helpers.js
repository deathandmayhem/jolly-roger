answerify = function(answer) {
  return answer.
    replace(/[^A-Za-z]/g, '').
    toUpperCase();
};

huntsMatchingCurrentUser = function(q) {
  // Adds a filter to the query to only show results from hunts that the user is a member of.
  // Assumes the collection being published has a field named `hunt` of type String containing the
  // _id of a document from the Hunts collection.
  // The caller binds `this` to be the one provided to the function of Meteor.publish(), so
  // this.userId is available.
  u = Meteor.users.findOne(this.userId);
  q = _.clone(q);

  if (_.has(q, 'hunt')) {
    if (_.isObject(q.hunt) &&
        _.some(q.hunt, (_, k) => k.startsWith('$'))) {
      q.hunt.$in = _.intersection(..._.compact([q.hunt.$in, u.hunts]));
    } else {
      q.hunt = {$in: _.intersection([q.hunt], u.hunts)};
    }
  } else {
    q = _.extend(q, {hunt: {$in: u.hunts}});
  }

  return q;
};
