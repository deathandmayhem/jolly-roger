slugify = function (title) {
  return title.
    replace(/\s+/g, '-').
    replace(/[^-A-Za-z0-9]/g, '').
    toLowerCase();
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
  }
}]);

JR.Transforms.Puzzle = class Puzzle {
  constructor(doc) {
    _.extend(this, doc);
  }

  getChildren() {
    return this.children.map(c => JR.Models.Puzzles.findOne(c));
  }
};

JR.Models.Puzzles = new JR.Models.Base("puzzles", {
  transform(doc) { return new JR.Transforms.Puzzle(doc); }
});
JR.Models.Puzzles.attachSchema(JR.Schemas.Puzzles);
