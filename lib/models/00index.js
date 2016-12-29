import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Symbol from 'es6-symbol';

// TODO: make these into imports
/* global Schemas: true, Transforms: true, Models: true */
/* eslint-disable consistent-return */

Schemas = {};
Transforms = {};
Models = {};

Schemas.Base = new SimpleSchema({
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

const modelSymbol = Symbol('model');
Transforms.Base = class Base {
  constructor(model, doc) {
    _.extend(this, doc);
    this[modelSymbol] = model;
  }

  model() {
    return this[modelSymbol];
  }

  // All models have a destroy method which performs any cascading
  // required (though since all models also have a "deleted" property
  // that hides all children, the default implementation usually
  // works)
  destroy(callback) {
    this.model().update(this._id, { $set: { deleted: true } }, callback);
  }

  undestroy(callback) {
    this.model().update(this._id, { $set: { deleted: false } }, callback);
  }
};

const formatQuery = Symbol('formatQuery');
Models.formatQuery = formatQuery;
Models.Base = class Base extends Mongo.Collection {
  constructor(name, options = {}) {
    const { klass, ...restOptions } = options;
    const Klass = klass || Transforms.Base;

    // Namespace table name in mongo, and set a default transform
    super(`jr_${name}`, _.extend({
      transform: doc => { return new Klass(this, doc); },
    }, restOptions));
    this.name = name;

    // All models have standard roles
    this.attachRoles(`mongo.${name}`);
  }

  [formatQuery](selector) {
    if (typeof selector === 'string' || selector instanceof Mongo.ObjectID) {
      return { _id: selector };
    } else {
      return selector;
    }
  }

  find(selector = {}, options = {}) {
    return super.find(_.extend({ deleted: false }, this[formatQuery](selector)), options);
  }

  findOne(selector = {}, options = {}) {
    return super.findOne(_.extend({ deleted: false }, this[formatQuery](selector)), options);
  }

  findDeleted(selector = {}, options = {}) {
    return super.find(_.extend({ deleted: true }, this[formatQuery](selector)), options);
  }

  findOneDeleted(selector = {}, options = {}) {
    return super.findOne(_.extend({ deleted: true }, this[formatQuery](selector)), options);
  }

  findAllowingDeleted(selector = {}, options = {}) {
    return super.find(selector, options);
  }

  findOneAllowingDeleted(selector = {}, options = {}) {
    return super.findOne(selector, options);
  }

  publish(modifier) {
    if (!Meteor.isServer) {
      return;
    }

    const publishFunc = function publishFunc(findFunc) {
      return function (q = {}) {
        check(q, Object);

        if (!this.userId) {
          return [];
        }

        let query = q;
        if (modifier) {
          query = modifier.apply(this, [q]);
        }

        return findFunc(query);
      };
    };
    Meteor.publish(`mongo.${this.name}`, publishFunc(this.find.bind(this)));
    Meteor.publish(`mongo.${this.name}.deleted`, publishFunc(this.findDeleted.bind(this)));
    Meteor.publish(
      `mongo.${this.name}.allowingDeleted`,
      publishFunc(this.findAllowingDeleted.bind(this)));
  }
};
