import { SimpleSchema } from 'meteor/aldeed:simple-schema';

/* eslint-disable consistent-return */

const Base = new SimpleSchema({
  deleted: {
    type: Boolean,
    autoValue() {
      if (this.isSet) {
        return;
      }

      if (this.isInsert) {
        return false;
      } else if (this.isUpsert) {
        return { $setOnInsert: false };
      }
    },
  },
  createdAt: {
    type: Date,
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
  createdBy: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      if (this.isInsert) {
        return this.userId;
      } else if (this.isUpsert) {
        return { $setOnInsert: this.userId };
      } else {
        this.unset(); // Prevent user from supplying their own value
      }
    },
  },
  updatedAt: {
    type: Date,
    denyInsert: true,
    optional: true,
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      }
    },
  },
  updatedBy: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    denyInsert: true,
    optional: true,
    autoValue() {
      if (this.isUpdate) {
        return this.userId;
      }
    },
  },
});

export default Base;
