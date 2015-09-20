Router.configure({
  layoutTemplate: 'layouts/main'
});

Router.route('/', () => {});
Router.route('/hello', function () {
  this.render('hello');
});
