import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';

const formatQuery = Symbol('formatQuery');
const formatOptions = Symbol('formatOptions');

class Base extends Mongo.Collection {
  constructor(name, options = {}) {
    // Namespace table name in mongo
    super(`jr_${name}`, options);
    this.name = name;

    // All models have standard roles
    this.attachRoles(`mongo.${name}`);
  }

  // All models have a destroy method which performs any cascading
  // required (though since all models also have a "deleted" property
  // that hides all children, the default implementation usually
  // works)
  destroy(id, callback) {
    this.update(id, { $set: { deleted: true } }, callback);
  }

  undestroy(id, callback) {
    this.update(id, { $set: { deleted: false } }, callback);
  }

  [formatQuery](selector) {
    if (typeof selector === 'string' || selector instanceof Mongo.ObjectID) {
      return { _id: selector };
    } else {
      return selector;
    }
  }

  [formatOptions](opts) {
    if (opts.fields) {
      return _.extend(
        {},
        opts,
        {
          fields: _.extend(
            {},
            opts.fields,
            { deleted: 1 },
          ),
        },
      );
    }

    return opts;
  }

  find(selector = {}, options = {}) {
    return super.find(
      _.extend({ deleted: false }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findOne(selector = {}, options = {}) {
    return super.findOne(
      _.extend({ deleted: false }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findDeleted(selector = {}, options = {}) {
    return super.find(
      _.extend({ deleted: true }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findOneDeleted(selector = {}, options = {}) {
    return super.findOne(
      _.extend({ deleted: true }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
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
      return function (q = {}, opts = {}) {
        check(q, Object);
        check(opts, {
          fields: Match.Maybe(Object),
          sort: Match.Maybe(Object),
          skip: Match.Maybe(Number),
          limit: Match.Maybe(Number),
        });

        if (!this.userId) {
          return [];
        }

        let query = q;
        if (modifier) {
          query = modifier.apply(this, [q]);
        }

        return findFunc(query, opts);
      };
    };
    Meteor.publish(`mongo.${this.name}`, publishFunc(this.find.bind(this)));
    Meteor.publish(`mongo.${this.name}.deleted`, publishFunc(this.findDeleted.bind(this)));
    Meteor.publish(
      `mongo.${this.name}.allowingDeleted`,
      publishFunc(this.findAllowingDeleted.bind(this))
    );
  }
}

export default Base;
