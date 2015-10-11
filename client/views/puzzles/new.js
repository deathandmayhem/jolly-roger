AutoForm.addHooks('jr-puzzle-new-form', {
  onSuccess(_, result) {
    const controller = Router.current();
    const puzzle = Models.Puzzles.findOne(result);

    Ansible.log('Created new puzzle', {
      _id: result,
      hunt: controller.params._id,
      parent: controller.params.query.parent,
      title: puzzle.title,
    });

    // We need to add this puzzle to someone's children list, or it
    // doesn't exist
    let parentId = controller.params.query.parent;
    let parentModel;
    if (parentId) {
      parentModel = Models.Puzzles;
    } else {
      parentModel = Models.Hunts;
      parentId = controller.params._id;
    }

    parentModel.update({_id: parentId}, {$push: {children: result}});

    $('#jr-puzzle-new-modal').modal('hide');
  },
});

Template['puzzles/new'].onRendered(function() {
  this.$('#jr-puzzle-new-modal').
    on('show.bs.modal', () => {
      AutoForm.resetForm('jr-puzzle-new-form');
    }).
    on('shown.bs.modal', () => {
      this.$('#jr-puzzle-new-form input[name=title]').focus();
    }).
    on('hidden.bs.modal', () => {
      Router.go('puzzles/list', Router.current().data());
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    this.$('#jr-puzzle-new-modal').modal(route === 'puzzles/new' ? 'show' : 'hide');
  });
});
