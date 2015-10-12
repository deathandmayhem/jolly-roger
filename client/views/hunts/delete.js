Template['hunts/delete'].helpers({
  hunt() {
    return Models.Hunts.findOne(Router.current().params._id);
  },
});

Template['hunts/delete'].events({
  'click .jr-button-hunt-delete': () => {
    const hunt = Router.current().params._id;
    Ansible.log('Deleting hunt', {_id: hunt});
    Models.Hunts.findOne(hunt).destroy();

    $('#jr-hunt-delete-modal').modal('hide');
  },
});

Template['hunts/delete'].onRendered(function() {
  this.$('#jr-hunt-delete-modal').
    on('shown.bs.modal', () => {
      this.$('.jr-button-hunt-delete').focus();
    }).
    on('hidden.bs.modal', () => {
      Router.go('hunts/list', Router.current().data());
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    this.$('#jr-hunt-delete-modal').modal(route === 'hunts/delete' ? 'show' : 'hide');
  });
});
