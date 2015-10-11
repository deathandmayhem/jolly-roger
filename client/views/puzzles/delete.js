Template['puzzles/delete'].helpers({
  puzzle() {
    return Models.Puzzles.findOne(Router.current().params.puzzle);
  },
});

Template['puzzles/delete'].events({
  'click .jr-button-puzzle-delete': () => {
    const puzzle = Router.current().params.puzzle;
    Ansible.log('Deleting puzzle', {_id: puzzle});
    Models.Puzzles.findOne(puzzle).destroy();

    $('#jr-puzzle-delete-modal').modal('hide');
  },
});

Template['puzzles/delete'].onRendered(function() {
  this.$('#jr-puzzle-delete-modal').
    on('shown.bs.modal', () => {
      this.$('.jr-button-puzzle-delete').focus();
    }).
    on('hidden.bs.modal', () => {
      Router.go('puzzles/list', Router.current().data());
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    this.$('#jr-puzzle-delete-modal').modal(route === 'puzzles/delete' ? 'show' : 'hide');
  });
});
