import SimpleSchema from 'simpl-schema';

const Subscribers = new SimpleSchema({
  server: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  connection: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  user: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  name: {
    type: String,
  },
  context: {
    type: Object,
    blackbox: true,
  },
  createdAt: {
    type: Date,
    // eslint-disable-next-line consistent-return
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        this.unset(); // Prevent user from supplying their own value
      }
    },
  },
  updatedAt: {
    type: Date,
    denyInsert: true,
    optional: true,
    // eslint-disable-next-line consistent-return
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      }
    },
  },
});

export default Subscribers;
