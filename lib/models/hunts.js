Schemas.Hunts = new SimpleSchema([Schemas.Base, {
  name: {
    type: String
  },
  // The puzzles in the puzzle tree immediately under the root node
  // (the root being represented by the hunt itself)
  children: {
    type: [String],
    regEx: SimpleSchema.RegEx.Id
  }
}]);

Transforms.Hunt = class Hunt extends Transforms.Base {
  getChildren() {
    return this.children.map(c => Models.Puzzles.findOne(c));
  }
};

Models.Hunts = new Models.Base("hunts", {klass: Transforms.Hunt});
Models.Hunts.attachSchema(Schemas.Hunts);
