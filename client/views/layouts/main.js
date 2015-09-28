Template['layouts/main'].helpers({
  statusIs(status) {
    return Meteor.status().status === status;
  },
  // Only valid if statusIs "failed"
  reason() {
    return Meteor.status().reason;
  },
  // Only valid if statusIs "waiting"
  timeToRetry() {
    return Math.floor((Meteor.status().retryTime - (new Date()).getTime()) / 1000);
  }
});

Template['layouts/main'].events({
  'click #jr-reconnect': function (event) {
    Meteor.reconnect();
    event.preventDefault();
  }
});
