Schemas.Documents = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    puzzle: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    type: {
      type: String,
      allowedValues: ['google-spreadsheet'],
    },
    value: {
      type: Object,
      blackbox: true,
    },
  },
]);

Models.Documents = new Models.Base('documents');
Models.Documents.attachSchema(Schemas.Documents);
Models.Documents.publish(huntsMatchingCurrentUser);
