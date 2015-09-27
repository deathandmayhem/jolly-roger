JR.Schemas.Hunts = new SimpleSchema([JR.Schemas.Base, {
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

JR.Transforms.Hunt = class Hunt extends JR.Transforms.Base {
  getChildren() {
    return this.children.map(c => JR.Models.Puzzles.findOne(c));
  }
};

JR.Models.Hunts = new JR.Models.Base("hunts", {klass: JR.Transforms.Hunt});
JR.Models.Hunts.attachSchema(JR.Schemas.Hunts);
