const options = {
  waitOn() {
    return [
      Meteor.subscribe('mongo.hunts', {_id: this.params._id}),
      Meteor.subscribe('mongo.puzzles', {hunt: this.params._id})
    ];
  },
  data() {
    return Models.Hunts.findOne(this.params._id);
  }
};
Router.route('/hunts/:_id', _.extend({
  name: 'hunts/show'
}, options));
Router.route('/hunts/:_id/new', _.extend({
  name: 'puzzles/new',
  template: 'hunts/show',
}, options));

AutoForm.addHooks('jr-puzzle-new-form', {
  onSuccess(_, result) {
    const controller = Router.current();
    Ansible.log('Created new puzzle', {
      _id: result,
      hunt: controller.params._id,
      title: Models.Puzzles.findOne(result).title
    });
    let parentModel, parentId = controller.params.query.parent;
    if (parentId) {
      parentModel = Models.Puzzles;
    } else {
      parentModel = Models.Hunts;
      parentId = controller.params._id;
    }

    parentModel.update({_id: parentId}, {$push: {children: result}});

    Router.go('hunts/show', controller.params);
  }
});

Template['hunts/show'].onRendered(function () {
  $('#jr-puzzle-new-modal').
    on('show.bs.modal', () => {
      AutoForm.resetForm('jr-puzzle-new-form');
    }).
    on('shown.bs.modal', () => {
      $('#jr-puzzle-new-form input[name=title]').focus();
    }).
    on('hide.bs.modal', () => {
      Router.go('hunts/show', Router.current().data());
    });

  this.autorun(() => {
    const route = Router.current().route.getName();
    $('#jr-puzzle-new-modal').modal(route === 'puzzles/new' ? 'show' : 'hide');
  });
});
