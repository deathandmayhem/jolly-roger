// counter starts at 0
Session.setDefault('counter', 0);

Template.hello.helpers({
  counter: () => Session.get('counter')
});

Template.hello.events({
  'click button': () => Session.set('counter', Session.get('counter') + 1)
});

Router.configure({
  layoutTemplate: 'layouts/main'
});
Router.route('/', () => {});
Router.route('/hello', () => this.render('hello'));
