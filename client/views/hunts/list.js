Router.route('/hunts', {
  name: 'hunts/list',
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts')
    ];
  },
  data() {
    // TODO: sort?
    return Models.Hunts.find();
  }
});
