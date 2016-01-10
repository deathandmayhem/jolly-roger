Meteor.methods({
  makeOperator(targetUserId) {
    check(targetUserId, String);
    if (!Roles.userHasRole(this.userId, 'admin')) {
      throw new Meteor.Error(403, 'Non-operators may not grant operator permissions.');
    }

    Meteor.users.update({
      _id: targetUserId,
    }, {
      $addToSet: {
        roles: 'admin',
      },
    });
  },
});
