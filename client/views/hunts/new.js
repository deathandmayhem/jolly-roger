AutoForm.addHooks('jr-hunt-new-form', {
  onSuccess(_, result) {
    Ansible.log('Created new hunt', {
      _id: result,
      name: Models.Hunts.findOne(result).name,
    });
    $('#jr-hunt-new-modal').modal('hide');
  },
});

Template['hunts/new'].onRendered(function() {
  $('#jr-hunt-new-modal').
    on('show.bs.modal', () => {
      AutoForm.resetForm('jr-hunt-new-form');
    }).
    on('hidden.bs.modal', () => {
      Router.go('hunts/list');
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    $('#jr-hunt-new-modal').modal(route === 'hunts/new' ? 'show' : 'hide');
  });
});
