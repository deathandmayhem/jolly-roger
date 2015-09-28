Schemas = {};
Transforms = {};
Models = {};

Schemas.Base = new SimpleSchema({
  createdAt: {
    type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return {$setOnInsert: new Date()};
      } else {
        this.unset();  // Prevent user from supplying their own value
      }
    }
  },
  updatedAt: {
    type: Date,
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      }
    },
    denyInsert: true,
    optional: true
  }
});

Transforms.Base = class Base {
  constructor(model, doc) {
    _.extend(this, doc);
    this.model = model;
  }
};

Models.Base = class Base extends Mongo.Collection {
  constructor(name, options) {
    let klass = options.klass || Transforms.Base;
    delete options.klass;

    // Namespace table name in mongo, and set a default transform
    super(`jr_${name}`, _.extend({
      transform: doc => { return new klass(this, doc); }
    }, options));

    if (Meteor.isServer) {
      // All models are published to all logged-in clients (with an
      // optional query)
      const self = this;
      Meteor.publish(`mongo.${name}`, function (q) {
        check(q, Object);
        if (this.userId) {
          return self.find(q);
        } else {
          return [];
        }
      });
    }

    // All models have standard roles
    this.attachRoles(`mongo.${name}`);
  }
};
