// Reuse the same options for both listing hunts and new hunt - latter
// is a modal on top of the list
const options = {
  waitOn() {
    return Meteor.subscribe('mongo.hunts');
  },

  data() {
    // TODO: sort?
    return Models.Hunts.find();
  },
};

Router.route('/hunts', _.extend({
  name: 'hunts/list',
}, options));
Router.route('/hunts/new', _.extend({
  name: 'hunts/new',
  template: 'hunts/list',
}, options));
