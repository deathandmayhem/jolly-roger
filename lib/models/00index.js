if (typeof JR === "undefined") {
  JR = {};
}

JR.Schemas = {};
JR.Transforms = {};
JR.Models = {};

JR.Schemas.Base = new SimpleSchema({
  createdAt: {
    type: Date,
    autoValue: function() {
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
    autoValue: function() {
      if (this.isUpdate) {
        return new Date();
      }
    },
    denyInsert: true,
    optional: true
  }
});

JR.Models.Base = class Base extends Mongo.Collection {
  constructor(name, ...args) {
    super(name, ...args);
    const self = this;
    if (Meteor.isServer) {
      // All models are published to all logged-in clients (with an
      // optional query)
      Meteor.publish(`mongo.${name}`, function(q) {
        check(q, Object);
        if (this.userId) {
          return self.find(q);
        } else {
          return [];
        }
      });
      // All models have standard roles
      this.attachRoles(`mongo.${name}`);
    }
  }
};
