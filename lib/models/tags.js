Schemas.Tags = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    // null means that the tag is global, i.e. shared across all hunts
    hunt: {
      type: String,
      optional: true,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);
Models.Tags = new Models.Base('tags');
Models.Tags.attachSchema(Schemas.Tags);
