Router.configure({
  layoutTemplate: 'layouts/main'
});

Router.onBeforeAction(function() {
  if (!Meteor.userId()) {
    this.layout('layouts/blank');
    this.render('login');
  } else {
    this.next();
  }
});
