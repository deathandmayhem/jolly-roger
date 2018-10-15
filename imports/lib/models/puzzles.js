import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { answerify, huntsMatchingCurrentUser } from '../../model-helpers.js';

Schemas.Puzzles = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    tags: {
      type: [String],
      regEx: SimpleSchema.RegEx.Id,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
      optional: true,
      regEx: SimpleSchema.RegEx.Url,
    },
    answer: {
      type: String,
      optional: true,
      autoValue() {
        if (this.isSet) {
          return answerify(this.value);
        }

        return undefined;
      },
    },
  },
]);

Models.Puzzles = new Models.Base('puzzles');
Models.Puzzles.attachSchema(Schemas.Puzzles);
Models.Puzzles.publish(huntsMatchingCurrentUser);
