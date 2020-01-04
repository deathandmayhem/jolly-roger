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
import moment from 'moment';
import Flags from '../flags';
import Servers from './models/servers';
import Subscribers from './models/subscribers';

const serverId = Random.id();

const cleanup = function () {
  // A noop update will still cause updatedAt to be updated
  Servers.upsert({ _id: serverId }, {});

  // Servers disappearing should be a fairly rare occurrence, so it's
  // OK for the timeouts here to be generous. Servers get 120 seconds
  // to update before their records are GC'd. Should be long enough to
  // account for transients
  const timeout = moment().subtract('120', 'seconds').toDate();
  const deadServers = Servers.find({ updatedAt: { $lt: timeout } })
    .map(server => server._id);
  if (deadServers.length === 0) {
    return;
  }

  Subscribers.remove({ server: { $in: deadServers } });
  Servers.remove({ _id: { $in: deadServers } });
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

  const doc = Subscribers.insert(<any>{
    server: serverId,
    connection: this.connection.id,
    user: this.userId,
    name,
    context,
  });
  this.onStop(() => Subscribers.remove(doc));

  return [];
});

// Ugh I tried to build something generic and it means our
// permissioning totally breaks down. For now, we'll let anyone
// (logged in) subscribe to any counter because Hunt is tomorrow and I
// don't think counts are thaaat sensitive, especially if you can't
// even look up the puzzle ids
//
// eslint-disable-next-line consistent-return
Meteor.publish('subscribers.counts', function (q: Record<string, any>) {
  check(q, Object);

  if (!this.userId) {
    return [];
  }

  const query: Record<string, any> = {};
  _.each(q, (v, k) => {
    if (k.startsWith('$')) {
      throw new Meteor.Error(400, 'Special query terms are not allowed');
    }

    query[`context.${k}`] = v;
  });

  let initialized = false;
  const counters: Record<string, Record<string, number>> = {};

  const cursor = Subscribers.find(query);
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
  return null;
});

// Unlike subscribers.counts, which takes a query string against the
// context, we require you to specify the name of a subscription here
// to avoid fanout.
//
// eslint-disable-next-line consistent-return
Meteor.publish('subscribers.fetch', function (name) {
  check(name, String);

  if (!this.userId) {
    return [];
  }

  const users: Record<string, number> = {};

  const cursor = Subscribers.find({ name });
  const handle = cursor.observe({
    added: (doc) => {
      const { user } = doc;

      if (!_.has(users, user)) {
        users[user] = 0;
        this.added('subscribers', `${name}:${user}`, { name, user });
      }

      users[user] += 1;
    },

    removed: (doc) => {
      const { user } = doc;

      users[user] -= 1;
      if (users[user] === 0) {
        delete users[user];
        this.removed('subscribers', `${name}:${user}`);
      }
    },
  });
  this.onStop(() => handle.stop());
  this.ready();
  return null;
});

Meteor.startup(() => periodic());
