import { Meteor } from "meteor/meteor";

Meteor.publish(null, function () {
  if (!this.userId) {
    return [];
  }

  return Meteor.users.find(this.userId, {
    fields: {
      suppressedDingwords: 1,
    },
  });
});
