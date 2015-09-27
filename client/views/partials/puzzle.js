findTarget = function(event) {
  const id = $(event.currentTarget).data('id');
  const parent = JR.Transforms.Puzzle.getParent(id);
  const idx = parent.children.indexOf(id);

  return [parent.model, parent._id, parent.children, idx];
};

Template['partials/puzzle'].events({
  'click .jr-btn-puzzle-top': function (event) {
    let [model, id, children, idx] = findTarget(event);
    if (idx === 0) {
      return;
    }

    children.splice(0, 0, ...children.splice(idx, 1));
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-up': function (event) {
    let [model, id, children, idx] = findTarget(event);
    if (idx === 0) {
      return;
    }

    children.splice(idx - 1, 0, ...children.splice(idx, 1));
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-down': function (event) {
    let [model, id, children, idx] = findTarget(event);
    if (idx === children.length - 1) {
      return;
    }

    children.splice(idx + 1, 0, ...children.splice(idx, 1));
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-bottom': function (event) {
    let [model, id, children, idx] = findTarget(event);
    if (idx === children.length - 1) {
      return;
    }

    children.splice(children.length - 1, 0, ...children.splice(idx, 1));
    model.update(id, {$set: {children}});
  }
});
