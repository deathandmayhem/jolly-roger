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
async function cleanupHook(deadServers: string[]) {
  await Subscribers.removeAsync({ server: { $in: deadServers } });
}
registerPeriodicCleanupHook(cleanupHook);

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

  // Map<UserId, Map<DocId, { visible, updatedAt }>>
  const userMap = new Map<
    string,
    Map<string, { visible: boolean; updatedAt: Date }>
  >();

  const updateClient = (user: string) => {
    const publicationId = `${name}:${user}`;
    const docs = userMap.get(user);

    if (!docs || docs.size === 0) {
      this.removed("subscribers", publicationId);
      return;
    }

    // Aggregation Logic:
    // 1. Visible if ANY connection is visible.
    // 2. updatedAt is the MAX updatedAt across connections.
    let isAnyVisible = false;
    let maxUpdatedAt = 0;

    for (const d of docs.values()) {
      if (d.visible) isAnyVisible = true;
      if (d.updatedAt.getTime() > maxUpdatedAt) {
        maxUpdatedAt = d.updatedAt.getTime();
      }
    }

    const payload = {
      name,
      user,
      visible: isAnyVisible,
      updatedAt: new Date(maxUpdatedAt),
    };

    // We store a '_sent' flag on the Map object itself to know if we need to Add or Change
    const state = docs as any;
    if (state._sent) {
      this.changed("subscribers", publicationId, payload);
    } else {
      this.added("subscribers", publicationId, payload);
      state._sent = true;
    }
  };

  const cursor = Subscribers.find({ name });
  const handle = await cursor.observeAsync({
    added: (doc) => {
      const { user } = doc;
      if (!userMap.has(user)) {
        userMap.set(user, new Map());
      }

      const visible = doc.context?.visible === "visible";
      const updatedAt = doc.updatedAt || new Date();

      userMap.get(user)!.set(doc._id, { visible, updatedAt });
      updateClient(user);
    },

    changed: (doc) => {
      const { user } = doc;
      if (userMap.has(user)) {
        const docs = userMap.get(user)!;
        if (docs.has(doc._id)) {
          const visible = doc.context?.visible === "visible";
          const updatedAt = doc.updatedAt || new Date();
          docs.set(doc._id, { visible, updatedAt });
          updateClient(user);
        }
      }
    },

    removed: (doc) => {
      const { user } = doc;
      if (userMap.has(user)) {
        const docs = userMap.get(user)!;
        docs.delete(doc._id);

        if (docs.size === 0) {
          updateClient(user); // Sends 'removed'
          userMap.delete(user);
        } else {
          updateClient(user); // Sends 'changed'
        }
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

  const cursor = Subscribers.find({ "context.hunt": hunt });

  const handle = await cursor.observeAsync({
    added: (doc) => {
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