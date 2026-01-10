// Used to track subscribers to the subscribers.counts record set
//
// So long as the server continues running, it can clean up after
// itself (and does so). But if the server process is killed (or dies
// of more natural causes), its server record will stick around, so we
// garbage collect subscriber records based on the updatedAt of the
// server record.

import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import MeteorUsers from "../lib/models/MeteorUsers";
import { registerPeriodicCleanupHook, serverId } from "./garbage-collection";
import Subscribers from "./models/Subscribers";

// Clean up leaked subscribers from dead servers periodically.
async function cleanupHook(deadServer: string) {
  await Subscribers.removeAsync({ server: deadServer });
}
registerPeriodicCleanupHook(cleanupHook);

const contextMatcher = Match.Where(
  (val: unknown): val is Record<string, string | boolean> => {
    if (!Match.test(val, Object)) {
      return false;
    }

    return Object.values(val).every(
      (v) => Match.test(v, String) || Match.test(v, Boolean),
    );
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

  this.onStop(async () => Subscribers.removeAsync(doc));

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
      if (!Object.hasOwn(counters, name)) {
        counters[name] = {};

        if (initialized) {
          this.added("subscribers.counts", name, { value: 0 });
        }
      }

      if (!Object.hasOwn(counters[name]!, user)) {
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

      if (!Object.hasOwn(users, user)) {
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
Meteor.publish("subscribers.fetchAll", async function (hunt) {
  check(hunt, String);

  if (!this.userId) {
    throw new Meteor.Error(401, "Not logged in");
  }

  const user = await MeteorUsers.findOneAsync(this.userId);
  if (!user?.hunts?.includes(hunt)) {
    throw new Meteor.Error(403, "Not a member of this hunt");
  }

  // 1. We track DETAILED state per document, grouped by the "Aggregate Key"
  // Map<Key, Map<DocId, { visible, updatedAt }>>
  const state = new Map();

  const updateClient = (key, name, user) => {
    const docs = state.get(key);

    if (!docs || docs.size === 0) {
      this.removed("subscribers", key);
      return;
    }

    // 2. Recalculate the "Best" state for this user
    let bestUpdatedAt = 0;
    let isAnyVisible = false;

    for (const docState of docs.values()) {
      if (docState.updatedAt && docState.updatedAt.getTime() > bestUpdatedAt) {
        bestUpdatedAt = docState.updatedAt.getTime();
      }

      if (docState.visible === "visible") {
        isAnyVisible = true;
      }
    }

    const payload = {
      name,
      user,
      updatedAt: new Date(bestUpdatedAt),
      visible: isAnyVisible,
    };

    // 3. Send to client (Added if new, Changed if exists)
    if (docs._sent) {
      this.changed("subscribers", key, payload);
    } else {
      this.added("subscribers", key, payload);
      docs._sent = true;
    }
  };

  const cursor = Subscribers.find({});

  const handle = cursor.observe({
    added: (doc) => {
      // Filter manually since we are observing all Subscribers (if desired)
      // or rely on client side filtering.
      // Assuming 'hunt' context matches or filtering happens in `find`:
      // if (doc.hunt !== hunt) return;

      const key = `${doc.name}:${doc.user}`;

      if (!state.has(key)) {
        state.set(key, new Map());
      }

      const docState = {
        visible: doc.context?.visible, // Capture the visibility
        updatedAt: doc.updatedAt,
      };

      state.get(key).set(doc._id, docState);
      updateClient(key, doc.name, doc.user);
    },

    changed: (doc) => {
      const key = `${doc.name}:${doc.user}`;
      if (state.has(key)) {
        const group = state.get(key);
        if (group.has(doc._id)) {
          const docState = {
            visible: doc.context?.visible,
            updatedAt: doc.updatedAt,
          };
          group.set(doc._id, docState);
          updateClient(key, doc.name, doc.user);
        }
      }
    },

    removed: (doc) => {
      const key = `${doc.name}:${doc.user}`;
      if (state.has(key)) {
        const group = state.get(key);
        group.delete(doc._id);

        if (group.size === 0) {
          // If empty, remove the group entirely so updateClient sends 'removed'
          // We need to call updateClient BEFORE deleting the map entry
          // so it sees size 0? No, updateClient checks checks size.
          // But if we delete the map entry, we lose the '_sent' flag.
          // So we keep the map entry until after updateClient, then delete if empty.
          updateClient(key, doc.name, doc.user);
          state.delete(key);
        } else {
          updateClient(key, doc.name, doc.user);
        }
      }
    },
  });

  this.onStop(() => handle.stop());
  this.ready();
});