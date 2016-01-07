Meteor.methods({
  joinHunt(huntId) {
    check(huntId, String);

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(401, 'You are not logged in');
    }

    hunt = huntFixtures[huntId] || Models.Hunts.findOne(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    Meteor.users.update(this.userId, {$addToSet: {hunts: huntId}});
    const user = Meteor.users.findOne(this.userId);
    const email = _.chain(user.emails).
      filter((email) => email.verified).
      pluck('address').
      first().
      value();

    _.each(hunt.mailingLists, (list) => {
      new Blanche.List(list).add(email);
    });
  },
});
