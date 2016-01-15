// Used to track subscribers to the subCounter record set
//
// So long as the server continues running, it can clean up after
// itself (and does so). But if the server process is killed (or dies
// of more natural causes), its counter will stick around, so we
// garbage collect based on updatedAt

const serverId = Random.id();

Schemas.Subscribers = new SimpleSchema({
  server: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  connection: {
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
});

Models.Subscribers = new class extends Meteor.Collection {
  constructor() {
    super('jr_subscribers');
  }

  cleanup() {
    // A noop update will still cause updatedAt to be updated
    this.update(
      {server: serverId},
      {},
      {multi: true});

    // Servers get 15 seconds to update before their records are
    // GC'd. Should be long enough to account for transients
    const timeout = moment().subtract('15', 'seconds').toDate();
    this.remove({
      $or: [
        {updatedAt: {$ne: null, $lt: timeout}},
        {updatedAt: null, createdAt: {$lt: timeout}},
      ],
    });
  }

  periodic() {
    this.cleanup();
    Meteor.setTimeout(this.periodic.bind(this), 2.5 + (2.5 * Random.fraction()));
  }
}();
Models.Subscribers.attachSchema(Schemas.Subscribers);

Meteor.publish('subCounter.inc', function(name, context) {
  check(name, String);
  check(context, Object);

  if (!this.userId) {
    return [];
  }

  const doc = Models.Subscribers.insert({
    server: serverId,
    connection: this.connection.id,
    name,
    context,
  });
  this.onStop(() => Models.Subscribers.remove(doc));

  return [];
});

// Ugh I tried to build something generic and it means our
// permissioning totally breaks down. For now, we'll let anyone
// (logged in) subscribe to any counter because Hunt is tomorrow and I
// don't think counts are thaaat sensitive, especially if you can't
// even look up the puzzle ids
Meteor.publish('subCounter.fetch', function(q) {
  check(q, Object);

  const query = {};
  _.each(q, (v, k) => {
    if (k.startsWith('$')) {
      throw new Meteor.Error(400, 'Special query terms are not allowed');
    }

    query[`context.${k}`] = v;
  });

  let initialized = false;
  const counters = {};

  const cursor = Models.Subscribers.find(query);
  const handle = cursor.observe({
    added: (doc) => {
      const {name} = doc;
      if (!_.has(counters, name)) {
        counters[name] = 0;

        if (initialized) {
          this.added('subCounter', name, {value: 0});
        }
      }

      counters[name] += 1;
      if (initialized) {
        this.changed('subCounter', name, {value: counters[name]});
      }
    },

    removed: (doc) => {
      const {name} = doc;

      counters[name] -= 1;
      if (initialized) {
        this.changed('subCounter', name, {value: counters[name]});
      }
    },
  });
  this.onStop(() => handle.stop());

  _.each(counters, (val, key) => this.added('subCounter', key, {value: val}));
  initialized = true;
  this.ready();
});

// Meteor.startup(() => Models.Subscribers.periodic());
