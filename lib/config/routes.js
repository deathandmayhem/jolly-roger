Router.configure({
  layoutTemplate: 'layouts/main'
});

AccountsTemplates.configure({
  defaultLayout: 'layouts/login'
});
AccountsTemplates.configureRoute('changePwd');
AccountsTemplates.configureRoute('enrollAccount');
AccountsTemplates.configureRoute('forgotPwd');
AccountsTemplates.configureRoute('resetPwd');
AccountsTemplates.configureRoute('signIn');
AccountsTemplates.configureRoute('verifyEmail');
AccountsTemplates.configureRoute('resendVerificationEmail');
AccountsTemplates.configureRoute('ensureSignedIn');

Router.plugin('ensureSignedIn', {
  except: _.pluck(AccountsTemplates.routes, 'name')
});
Router.onBeforeAction('dataNotFound');

Router.route('/', () => {});
Router.route('/hello', function () {
  this.render('hello');
});
