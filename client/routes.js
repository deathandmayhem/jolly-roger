Router.configure({
  layoutTemplate: 'layouts/main'
});

Router.onBeforeAction(function() {
  if (!Meteor.userId()) {
    this.render('login', {data: () => ({error: Session.get('login-error')})});
  } else {
    this.next();
  }
});

Router.route('/', () => {});
Router.route('/hello', function () {
  this.render('hello');
});
