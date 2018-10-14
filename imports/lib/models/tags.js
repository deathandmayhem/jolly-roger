import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { huntsMatchingCurrentUser } from '/imports/model-helpers.js';

Schemas.Tags = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);
Models.Tags = new Models.Base('tags');
Models.Tags.attachSchema(Schemas.Tags);
Models.Tags.publish(huntsMatchingCurrentUser);
