Schemas.Hunts = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },
  },
]);

Models.Hunts = new Models.Base('hunts');
Models.Hunts.attachSchema(Schemas.Hunts);
