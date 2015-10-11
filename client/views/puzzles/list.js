const options = {
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts', {_id: this.params._id}),
      Meteor.subscribe('mongo.puzzles', {hunt: this.params._id}),
    ];
  },

  data() {
    return Models.Hunts.findOne(this.params._id);
  },
};
Router.route('/hunts/:_id', function() {
  this.redirect('puzzles/list', this.params);
});

Router.route('/hunts/:_id/puzzles', _.extend({
  name: 'puzzles/list',
}, options));
Router.route('/hunts/:_id/puzzles/new', _.extend({
  name: 'puzzles/new',
  template: 'puzzles/list',
}, options));
