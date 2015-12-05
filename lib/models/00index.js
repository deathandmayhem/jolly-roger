Schemas = {};
Transforms = {};
Models = {};

Schemas.Base = new SimpleSchema({
  deleted: {
    type: Boolean,
    defaultValue: false,
  },
  createdAt: {
    type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return {$setOnInsert: new Date()};
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
        return {$setOnInsert: this.userId};
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

Transforms.Base = class Base {
  constructor(model, doc) {
    _.extend(this, doc);
    this.model = model;
  }

  // All models have a destroy method which performs any cascading
  // required (though since all models also have a "deleted" property
  // that hides all children, the default implementation usually
  // works)
  destroy() {
    this.model.update(this._id, {$set: {deleted: true}});
  }

  undestroy() {
    this.model.update(this._id, {$set: {deleted: false}});
  }
};

const formatQuery = '@@formatQuery';
Models.Base = class Base extends Mongo.Collection {
  constructor(name, options={}) {
    let Klass = options.klass || Transforms.Base;
    delete options.klass;

    // Namespace table name in mongo, and set a default transform
    super(`jr_${name}`, _.extend({
      transform: doc => { return new Klass(this, doc); },
    }, options));

    if (Meteor.isServer) {
      // All models are published to all logged-in clients (with an
      // optional query)
      const _this = this;
      Meteor.publish(`mongo.${name}`, function(q={}) {
        check(q, Match.Optional(Object));
        if (this.userId) {
          return _this.find(q);
        } else {
          return [];
        }
      });

      Meteor.publish(`mongo.${name}.deleted`, function(q={}) {
        check(q, Match.Optional(Object));
        if (this.userId) {
          return _this.findDeleted(q);
        } else {
          return [];
        }
      });
    }

    // All models have standard roles
    this.attachRoles(`mongo.${name}`);
  }

  [formatQuery](selector) {
    if (typeof selector === 'string' || selector instanceof Mongo.ObjectID) {
      return {_id: selector};
    } else {
      return selector;
    }
  }

  find(selector={}, options={}) {
    return super.find(_.extend({deleted: false}, this[formatQuery](selector)), options);
  }

  findOne(selector={}, options={}) {
    return super.findOne(_.extend({deleted: false}, this[formatQuery](selector)), options);
  }

  findDeleted(selector={}, options={}) {
    return super.find(_.extend({deleted: true}, this[formatQuery](selector)), options);
  }

  findOneDeleted(selector={}, options={}) {
    return super.findOne(_.extend({deleted: true}, this[formatQuery](selector)), options);
  }
};
