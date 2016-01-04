answerify = function(answer) {
  return answer.
    replace(/[^A-Za-z]/g, '').
    toUpperCase();
};

Schemas.Puzzles = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    tags: {
      type: [String],
      regEx: SimpleSchema.RegEx.Id,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
      optional: true,
      regEx: SimpleSchema.RegEx.Url,
    },
    answer: {
      type: String,
      optional: true,
      autoValue() {
        if (this.isSet) {
          return answerify(this.value);
        }
      },
    },
  },
]);

Models.Puzzles = new Models.Base('puzzles');
Models.Puzzles.attachSchema(Schemas.Puzzles);
Models.Puzzles.publish(function(q) {
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
});
