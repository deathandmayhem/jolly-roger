import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const Servers = new SimpleSchema({
  // unlike most updatedAt values, this one also gets set on created
  // for convenience
  updatedAt: {
    type: Date,
    autoValue() {
      return new Date();
    },
  },
});

export default Servers;
