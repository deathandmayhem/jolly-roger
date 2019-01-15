import SimpleSchema from 'simpl-schema';
import Base from '../../lib/schemas/base';

const APIKeys = new SimpleSchema({
  user: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  key: {
    type: String,
    regEx: /^[A-Za-z0-9]{32}$/,
  },
});
APIKeys.extend(Base);

export default APIKeys;
