Schemas.Hunts = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },
  },
]);

Transforms.Hunt = class Hunt extends Transforms.Base {
};

Models.Hunts = new Models.Base('hunts', {klass: Transforms.Hunt});
Models.Hunts.attachSchema(Schemas.Hunts);

// All hunts are accessible, since they only contain metadata
Models.Hunts.publish();
