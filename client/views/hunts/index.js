// Reuse the same options for both listing hunts and new hunt - latter
// is a modal on top of the list
const options = {
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts')
    ];
  },
  data() {
    // TODO: sort?
    return Models.Hunts.find();
  }
};

Router.route('/hunts', _.extend({
  name: 'hunts/index',
}, options));
Router.route('/hunts/new', _.extend({
  name: 'hunts/new',
  template: 'hunts/index',
}, options));

Template['hunts/index'].onRendered(function () {
  $('#jr-hunt-new-modal').on('hide.bs.modal', () => {
    Router.go('hunts/index');
  });

  this.autorun(() => {
    const route = Router.current().route.getName();
    $('#jr-hunt-new-modal').modal(route === 'hunts/new' ? 'show' : 'hide');
  });
});
