// Reuse the same options for both listing hunts and new hunt - latter
// is a modal on top of the list
const options = {
  waitOn() {
    return Meteor.subscribe('mongo.hunts');
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

AutoForm.addHooks('jr-hunt-new-form', {
  onSuccess(_, result) {
    Ansible.log('Created new hunt', {
      _id: result,
      name: Models.Hunts.findOne(result).name
    });
    Router.go('hunts/index');
  }
});

Template['hunts/index'].onRendered(function () {
  $('#jr-hunt-new-modal').
    on('show.bs.modal', () => {
      AutoForm.resetForm('jr-hunt-new-form');
    }).
    on('shown.bs.modal', () => {
      $('#jr-hunt-new-form input[name=name]').focus();
    }).
    on('hide.bs.modal', () => {
      Router.go('hunts/index');
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    $('#jr-hunt-new-modal').modal(route === 'hunts/new' ? 'show' : 'hide');
  });
});
