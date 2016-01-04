Schemas.Tags = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);
Models.Tags = new Models.Base('tags');
Models.Tags.attachSchema(Schemas.Tags);
Models.Tags.publish(function(q) {
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
