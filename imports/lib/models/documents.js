import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { huntsMatchingCurrentUser } from '../../model-helpers.js';

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
    provider: {
      type: String,
      allowedValues: ['google'],
    },
    // This is opaque to the specific provider.
    //
    // For provider=google, this consists of a "type" ("sheets" or
    // "docs") and an id
    value: {
      type: Object,
      blackbox: true,
    },
  },
]);

Models.Documents = new Models.Base('documents');
Models.Documents.attachSchema(Schemas.Documents);
Models.Documents.publish(huntsMatchingCurrentUser);
