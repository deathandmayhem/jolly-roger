Router.route('/hunts/:_id', {
  name: 'hunts/show',
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts', {_id: this.params._id}),
      Meteor.subscribe('mongo.puzzles', {hunt: this.params._id})
    ];
  },
  data() {
    return Models.Hunts.findOne(this.params._id);
  }
});
