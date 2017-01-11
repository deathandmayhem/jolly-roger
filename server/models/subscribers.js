// Used to track subscribers to the subscribers.counts record set
//
// So long as the server continues running, it can clean up after
// itself (and does so). But if the server process is killed (or dies
// of more natural causes), its server record will stick around, so we
// garbage collect subscriber records based on the updatedAt of the
// server record.

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import moment from 'moment';
import { Flags } from '/imports/flags.js';

const serverId = Random.id();

Schemas.Servers = new SimpleSchema({
  // unlike most updatedAt values, this one also gets set on created
  // for convenience
  updatedAt: {
    type: Date,
    autoValue() {
      return new Date();
    },
  },
});

Schemas.Subscribers = new SimpleSchema({
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

Models.Servers = new class extends Meteor.Collection {
  constructor() {
    super('jr_servers');
  }
}();
Models.Servers.attachSchema(Schemas.Servers);

Models.Subscribers = new class extends Meteor.Collection {
  constructor() {
    super('jr_subscribers');
  }
}();
Models.Subscribers.attachSchema(Schemas.Subscribers);

const cleanup = function () {
  // A noop update will still cause updatedAt to be updated
  Models.Servers.upsert({ _id: serverId }, {});

  // Servers disappearing should be a fairly rare occurrence, so it's
  // OK for the timeouts here to be generous. Servers get 120 seconds
  // to update before their records are GC'd. Should be long enough to
  // account for transients
  const timeout = moment().subtract('120', 'seconds').toDate();
  const deadServers = Models.Servers.find({ updatedAt: { $lt: timeout } })
          .map((server) => server._id);
  if (deadServers.length === 0) {
    return;
  }

  Models.Subscribers.remove({ server: { $in: deadServers } });
  Models.Servers.remove({ _id: { $in: deadServers } });
};

const periodic = function () {
  // Attempt to refresh our server record every 30 seconds (with
  // jitter). We should have 4 periods before we get GC'd mistakenly.
  Meteor.setTimeout(periodic, 15000 + (15000 * Random.fraction()));
  if (!Flags.active('disable.subcounters')) {
    cleanup();
  }
};

Meteor.publish('subscribers.inc', function (name, context) {
  check(name, String);
  check(context, Object);

  if (!this.userId) {
    return [];
  }

  const doc = Models.Subscribers.insert({
    server: serverId,
    connection: this.connection.id,
    user: this.userId,
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
//
// eslint-disable-next-line consistent-return
Meteor.publish('subscribers.counts', function (q) {
  check(q, Object);

  if (!this.userId) {
    return [];
  }

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
      const { name, user } = doc;
      if (!_.has(counters, name)) {
        counters[name] = {};

        if (initialized) {
          this.added('subscribers.counts', name, { value: 0 });
        }
      }

      if (!_.has(counters[name], user)) {
        counters[name][user] = 0;
      }

      counters[name][user] += 1;
      if (initialized) {
        this.changed('subscribers.counts', name, { value: _.keys(counters[name]).length });
      }
    },

    removed: (doc) => {
      const { name, user } = doc;

      counters[name][user] -= 1;
      if (counters[name][user] === 0) {
        delete counters[name][user];
      }

      if (initialized) {
        this.changed('subscribers.counts', name, { value: _.keys(counters[name]).length });
      }
    },
  });
  this.onStop(() => handle.stop());

  _.each(counters, (val, key) => {
    this.added('subscribers.counts', key, { value: _.keys(val).length });
  });
  initialized = true;
  this.ready();
});

Meteor.startup(() => periodic());
