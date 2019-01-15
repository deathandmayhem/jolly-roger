import SimpleSchema from 'simpl-schema';
import Base from './base';

const Documents = new SimpleSchema({
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
});
Documents.extend(Base);

export default Documents;
