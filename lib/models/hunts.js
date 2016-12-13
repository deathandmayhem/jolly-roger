import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.Hunts = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    // Everyone that joins the hunt will be added to these mailing
    // lists
    mailingLists: {
      type: [String],
      defaultValue: [],
    },

    // This message is displayed (as markdown) to users that are not
    // members of this hunt. It should include instructions on how to
    // join
    signupMessage: {
      type: String,
      optional: true,
    },
  },
]);

Transforms.Hunt = class Hunt extends Transforms.Base {
};

Models.Hunts = new Models.Base('hunts', { klass: Transforms.Hunt });
Models.Hunts.attachSchema(Schemas.Hunts);

// All hunts are accessible, since they only contain metadata
Models.Hunts.publish();
