JR.Schemas.Hunts = new SimpleSchema([JR.Schemas.Base, {
  name: {
    type: String
  },
  // The puzzles immediately under the root, which is the hunt itself
  children: {
    type: [String],
    regEx: SimpleSchema.RegEx.Id
  }
}]);

JR.Transforms.Hunt = function (doc) {
  _.extend(this, doc);
};
_.extend(JR.Transforms.Hunt.prototype, {
  getChildren() {
    return this.children.map(c => JR.Models.Puzzles.findOne(c));
  }
});

JR.Models.Hunts = new JR.Models.Base("hunts", {
  transform(doc) { return new JR.Transforms.Hunt(doc); }
});
JR.Models.Hunts.attachSchema(JR.Schemas.Hunts);
