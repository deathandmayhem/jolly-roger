import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { answerify } from '../../model-helpers.js';
import Base from './base.js';

const Puzzles = new SimpleSchema([
  Base,
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

export default Puzzles;
