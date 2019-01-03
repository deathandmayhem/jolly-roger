import SimpleSchema from 'simpl-schema';

const Lock = new SimpleSchema({
  name: {
    type: String,
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
});

export default Lock;
