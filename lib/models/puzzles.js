slugify = function (title) {
  return title.
    replace(/\s+/g, '-').
    replace(/[^-A-Za-z0-9]/g, '').
    toLowerCase();
};

answerify = function (answer) {
  return answer.
    replace(/[^A-Za-z]/g, '').
    toUpperCase();
};

Schemas.Puzzles = new SimpleSchema([Schemas.Base, {
  hunt: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  children: {
    type: [String],
    regEx: SimpleSchema.RegEx.Id
  },
  title: {
    type: String
  },
  slug: {
    type: String,
    autoValue() {
      if (!this.isSet && this.field('title').isSet) {
        return slugify(this.field('title').value);
      }
    }
  },
  url: {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Url
  },
  answerable: {
    type: Boolean,
    defaultValue: true
  },
  answer: {
    type: String,
    optional: true,
    autoValue() {
      if (this.isSet) {
        return answerify(this.value);
      }
    }
  }
}]);

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
};

Models.Puzzles = new Models.Base("puzzles", {klass: Transforms.Puzzle});
Models.Puzzles.attachSchema(Schemas.Puzzles);
