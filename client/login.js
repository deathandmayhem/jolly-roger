Template.login.events({
  'click #form-login button[type=submit]': function (event, template) {
    event.preventDefault();
    Meteor.loginWithPassword(
      template.$('#login-user').val(),
      template.$('#login-password').val(),
      (err) => Session.set('login-error', err)
    );
  }
});
