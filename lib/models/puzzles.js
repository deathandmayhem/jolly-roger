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

JR.Schemas.Puzzles = new SimpleSchema([JR.Schemas.Base, {
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

JR.Transforms.Puzzle = class Puzzle extends JR.Transforms.Base {
  getChildren() {
    return this.children.map(c => JR.Models.Puzzles.findOne(c));
  }

  static getParent(id) {
    return JR.Models.Puzzles.findOne({children: id}) || JR.Models.Hunts.findOne({children: id});
  }

  getParent() {
    return JR.Transforms.Puzzle.getParent(this._id);
  }
};

JR.Models.Puzzles = new JR.Models.Base("puzzles", {klass: JR.Transforms.Puzzle});
JR.Models.Puzzles.attachSchema(JR.Schemas.Puzzles);
