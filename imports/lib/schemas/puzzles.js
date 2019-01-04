import SimpleSchema from 'simpl-schema';
import { answerify } from '../../model-helpers.js';
import Base from './base.js';

const Puzzles = new SimpleSchema({
  hunt: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  tags: {
    type: Array,
  },
  'tags.$': {
    type: String,
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
});
Puzzles.extend(Base);

export default Puzzles;
