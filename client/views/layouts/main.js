Template['layouts/main'].helpers({
  currentRouteIs(name) {
    return Router.current().route.getName() === name;
  },

  statusIs(status) {
    return Meteor.status().status === status;
  },

  // Only valid if statusIs "failed"
  reason() {
    return Meteor.status().reason;
  },

  // Only valid if statusIs "waiting"
  timeToRetry() {
    // Just to tie re-rendering to the timer
    Session.get('now');

    return Math.ceil((Meteor.status().retryTime - (new Date()).getTime()) / 1000);
  },
});

Template['layouts/main'].events({
  'click #jr-reconnect': function(event) {
    Meteor.reconnect();
    event.preventDefault();
  },
});

Template['layouts/main'].onCreated(function() {
  this.timer = null;

  this.autorun(() => {
    if (Meteor.status().status === 'waiting') {
      if (!this.timer) {
        this.timer = Meteor.setInterval(() => Session.set('now', new Date()), 1000);
      }
    } else {
      if (this.timer) {
        Meteor.clearInterval(this.timer);
        this.timer = null;
      }
    }
  });
});
