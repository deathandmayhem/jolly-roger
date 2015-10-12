Schemas.Hunts = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    // The hunt is the root node of the puzzle tree
    children: {
      type: [String],
      defaultValue: [],
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);

Transforms.Hunt = class Hunt extends Transforms.Base {
  getChildren() {
    return this.children.map(c => Models.Puzzles.findOne(c)).filter(c => c);
  }
};

Models.Hunts = new Models.Base('hunts', {klass: Transforms.Hunt});
Models.Hunts.attachSchema(Schemas.Hunts);
