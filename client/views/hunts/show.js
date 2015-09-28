Router.route('/hunts/:id', {
  name: 'hunts/show',
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts', {_id: this.params.id}),
      Meteor.subscribe('mongo.puzzles', {hunt: this.params.id})
    ];
  },
  data() {
    return Models.Hunts.findOne(this.params.id);
  }
});
