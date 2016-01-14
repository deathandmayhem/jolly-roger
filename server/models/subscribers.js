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
};
Models.Subscribers.attachSchema(Schemas.Subscribers);

Meteor.publish('subCounter', function(name, countMe=true) {
  check(name, String);
  check(countMe, Boolean);

  if (countMe) {
    const doc = Models.Subscribers.insert({
      server: serverId,
      connection: this.connection.id,
      name,
    });
    this.onStop(() => Models.Subscribers.remove(doc));
  }

  let counter = 0;
  this.added('subCounter', name, {counter});

  const cursor = Models.Subscribers.find({name});
  const handle = cursor.observeChanges({
    added: () => {
      counter += 1;
      this.changed('subCounter', name, {counter});
    },

    removed: () => {
      counter -= 1;
      this.changed('subCounter', name, {counter});
    },
  });
  this.onStop(() => handle.stop());

  this.ready();
});

Meteor.startup(() => Models.Subscribers.periodic());
