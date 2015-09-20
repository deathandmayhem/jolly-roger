Router.configure({
  layoutTemplate: 'layouts/main'
});
Router.route('/', () => {});
Router.route('/hello', () => this.render('hello'));
