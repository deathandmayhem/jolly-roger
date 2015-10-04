answerify = function(answer) {
  return answer.
    replace(/[^A-Za-z]/g, '').
    toUpperCase();
};

Schemas.Puzzles = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    children: {
      type: [String],
      defaultValue: [],
      regEx: SimpleSchema.RegEx.Id,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
      optional: true,
      regEx: SimpleSchema.RegEx.Url,
    },
    answerable: {
      type: Boolean,
      defaultValue: true,
    },
    answer: {
      type: String,
      optional: true,
      autoValue() {
        if (this.isSet) {
          return answerify(this.value);
        }
      },
    },
  },
]);

Transforms.Puzzle = class Puzzle extends Transforms.Base {
  getChildren() {
    return this.children.map(c => Models.Puzzles.findOne(c));
  }

  static getParent(id) {
    return Models.Puzzles.findOne({children: id}) || Models.Hunts.findOne({children: id});
  }

  getParent() {
    return Transforms.Puzzle.getParent(this._id);
  }

  getFullySolved() {
    return (!this.answerable || this.answer) && this.getChildren().every(c => c.getFullySolved);
  }

  destroy() {
    this.getChildren().forEach(c => c.destroy());
    const parent = this.getParent();
    parent.model.update(parent._id, {$pull: {children: this._id}});
    super.destroy();
  }
};

Models.Puzzles = new Models.Base('puzzles', {klass: Transforms.Puzzle});
Models.Puzzles.attachSchema(Schemas.Puzzles);
