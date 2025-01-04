// Used to track subscribers to the subscribers.counts record set
//
// So long as the server continues running, it can clean up after
// itself (and does so). But if the server process is killed (or dies
// of more natural causes), its server record will stick around, so we
// garbage collect subscriber records based on the updatedAt of the
// server record.

import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { serverId, registerPeriodicCleanupHook } from "./garbage-collection";
import Subscribers from "./models/Subscribers";
import { trace } from "console";
import GlobalHooks from "./GlobalHooks";

// Clean up leaked subscribers from dead servers periodically.
async function cleanupHook(deadServers: string[]) {
  await Subscribers.removeAsync({ server: { $in: deadServers } });
}
registerPeriodicCleanupHook(cleanupHook);

// eslint-disable-next-line new-cap
const contextMatcher = Match.Where(
  (val: unknown): val is Record<string, string> => {
    if (!Match.test(val, Object)) {
      return false;
    }

    return Object.values(val).every((v) => Match.test(v, String));
  },
);

Meteor.publish("subscribers.inc", async function (name, context) {
  check(name, String);
  check(context, contextMatcher);

  if (!this.userId) {
    return [];
  }

  const doc = await Subscribers.insertAsync(<any>{
    server: serverId,
    connection: this.connection.id,
    user: this.userId,
    name,
    context,
  });

  this.onStop(async () => {
    await Subscribers.removeAsync(doc);

    const countOfSubs = Subscribers.find({name, context}).count();
    if (countOfSubs === 0 && name.lastIndexOf("puzzle:") === 0) {
        await GlobalHooks.runNoPuzzleViewers(name.split(":")[1]);
    }
  });

  return [];
});

// Ugh I tried to build something generic and it means our
// permissioning totally breaks down. For now, we'll let anyone
// (logged in) subscribe to any counter because Hunt is tomorrow and I
// don't think counts are thaaat sensitive, especially if you can't
// even look up the puzzle ids
Meteor.publish("subscribers.counts", async function (q: Record<string, any>) {
  check(q, Object);

  if (!this.userId) {
    return [];
  }

  const query: Record<string, any> = {};
  Object.entries(q).forEach(([k, v]) => {
    if (k.startsWith("$")) {
      throw new Meteor.Error(400, "Special query terms are not allowed");
    }

    query[`context.${k}`] = v;
  });

  let initialized = false;
  const counters: Record<string, Record<string, number>> = {};

  const cursor = Subscribers.find(query);
  const handle = await cursor.observeAsync({
    added: (doc) => {
      const { name, user } = doc;
      if (!Object.prototype.hasOwnProperty.call(counters, name)) {
        counters[name] = {};

        if (initialized) {
          this.added("subscribers.counts", name, { value: 0 });
        }
      }

      if (!Object.prototype.hasOwnProperty.call(counters[name], user)) {
        counters[name]![user] = 0;
      }

      counters[name]![user]! += 1;
      if (initialized) {
        this.changed("subscribers.counts", name, {
          value: Object.keys(counters[name]!).length,
        });
      }
    },

    removed: (doc) => {
      const { name, user } = doc;

      counters[name]![user]! -= 1;
      if (counters[name]![user] === 0) {
        delete counters[name]![user];
      }

      if (initialized) {
        this.changed("subscribers.counts", name, {
          value: Object.keys(counters[name]!).length,
        });
      }
    },
  });
  this.onStop(() => handle.stop());

  Object.entries(counters).forEach(([key, val]) => {
    this.added("subscribers.counts", key, { value: Object.keys(val).length });
  });
  initialized = true;
  this.ready();
  return undefined;
});

// Unlike subscribers.counts, which takes a query string against the
// context, we require you to specify the name of a subscription here
// to avoid fanout.
Meteor.publish("subscribers.fetch", async function (name) {
  check(name, String);

  if (!this.userId) {
    return [];
  }

  const users: Record<string, number> = {};

  const cursor = Subscribers.find({ name });
  const handle = await cursor.observeAsync({
    added: (doc) => {
      const { user } = doc;

      if (!Object.prototype.hasOwnProperty.call(users, user)) {
        users[user] = 0;
        this.added("subscribers", `${name}:${user}`, { name, user });
      }

      users[user]! += 1;
    },

    removed: (doc) => {
      const { user } = doc;

      users[user]! -= 1;
      if (users[user] === 0) {
        delete users[user];
        this.removed("subscribers", `${name}:${user}`);
      }
    },
  });
  this.onStop(() => handle.stop());
  this.ready();
  return undefined;
});

// this is the unsafe version of the above
Meteor.publish("subscribers.fetchAll", function () {

  if (!this.userId) {
    return [];
  }

  const users: Record<string, number> = {};

  const cursor = Subscribers.find({});
  const handle = cursor.observe({
    added: (doc) => {
      const { user } = doc;

      if (!Object.prototype.hasOwnProperty.call(users, user)) {
        users[user] = 0;
        this.added("subscribers", `${name}:${user}`, { name, user });
      }

      users[user] += 1;
    },

    removed: (doc) => {
      const { user } = doc;

      users[user] -= 1;
      if (users[user] === 0) {
        delete users[user];
        this.removed("subscribers", `${name}:${user}`);
      }
    },
  });
  this.onStop(() => handle.stop());
  this.ready();
  return undefined;
});
