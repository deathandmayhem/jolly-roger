Template['partials/puzzle'].helpers({
  hunt() {
    return Models.Hunts.findOne(this.hunt);
  },

  parent() {
    return {parent: this._id};
  },

  removeData() {
    return {_id: this.hunt, puzzle: this._id};
  },
});

findTarget = function(event) {
  const id = $(event.currentTarget).data('id');
  const parent = Transforms.Puzzle.getParent(id);
  const idx = parent.children.indexOf(id);

  return [parent.model, parent._id, parent.children, idx];
};

Template['partials/puzzle'].events({
  'click .jr-btn-puzzle-top': event => {
    const [model, id, children, idx] = findTarget(event);
    if (idx === 0) {
      return;
    }

    children.splice(0, 0, ...children.splice(idx, 1));
    Ansible.log('Moving puzzle', {_id: id, change: 'top', from: idx, to: 0});
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-up': event => {
    const [model, id, children, idx] = findTarget(event);
    if (idx === 0) {
      return;
    }

    children.splice(idx - 1, 0, ...children.splice(idx, 1));
    Ansible.log('Moving puzzle', {_id: id, change: 'up', from: idx, to: idx - 1});
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-down': event => {
    const [model, id, children, idx] = findTarget(event);
    if (idx === children.length - 1) {
      return;
    }

    children.splice(idx + 1, 0, ...children.splice(idx, 1));
    Ansible.log('Moving puzzle', {_id: id, change: 'down', from: idx, to: idx + 1});
    model.update(id, {$set: {children}});
  },

  'click .jr-btn-puzzle-bottom': event => {
    const [model, id, children, idx] = findTarget(event);
    if (idx === children.length - 1) {
      return;
    }

    children.splice(children.length - 1, 0, ...children.splice(idx, 1));
    Ansible.log('Moving puzzle', {_id: id, change: 'bottom', from: idx, to: children.length - 1});
    model.update(id, {$set: {children}});
  },
});
