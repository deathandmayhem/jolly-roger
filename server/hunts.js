Meteor.methods({
  joinHunt(huntId) {
    check(huntId, String);

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(401, 'You are not logged in');
    }

    hunt = Models.Hunts.findOne(huntId);
    if (!hunt && !_.has(huntFixtures, huntId)) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    Meteor.users.update(this.userId, {$addToSet: {hunts: huntId}});
  },
});
