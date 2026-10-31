import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Flags from "../Flags";
import Logger from "../Logger";
import type { AttentionStateSignalType } from "../lib/engagement/attentionSignals";
import { registerPeriodicCleanupHook } from "./garbage-collection";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import type {
  AttentionEventType,
  AttentionTransitionType,
} from "./models/AttentionTransitions";
import AttentionTransitions from "./models/AttentionTransitions";
import onExit from "./onExit";
import serverId from "./serverId";

// Recording of raw attention events (in AttentionTransitions) to subsequently
// be consumed by the reducer into AttentionStates. Clients don't report their
// own close events, so we track clients that have reported in by Meteor
// connection so that we can append their close when necessary.

interface AttentionKey {
  user: string;
  connection: string;
  tab: string;
}

interface AttentionContext {
  hunt?: string;
  puzzle?: string;
}

async function insertEvent(
  key: AttentionKey,
  event: AttentionEventType,
  dedupKey: string,
  at: Date,
): Promise<void> {
  await ignoringDuplicateKeyErrors(() =>
    AttentionTransitions.insertAsync({
      ...key,
      ...event,
      server: serverId,
      ts: at,
      dedupKey,
    }),
  );
}

// Store an event for initial load or navigation
export function appendContext(
  key: AttentionKey,
  { hunt, puzzle }: AttentionContext,
  dedupKey: string,
  at: Date,
): Promise<void> {
  return insertEvent(key, { signal: "context", hunt, puzzle }, dedupKey, at);
}

// Store an event for a single signal changing
export function appendSignal(
  key: AttentionKey,
  signal: AttentionStateSignalType,
  value: boolean,
  dedupKey: string,
  at: Date,
): Promise<void> {
  return insertEvent(key, { signal, value }, dedupKey, at);
}

// Store an event when a connection goes away (on disconnect, or from the
// dead-server sweep). Derive the dedup key from the connection, so that the
// close only gets recorded once (even if multiple processes attempt to close).
export function appendClose(
  { user, tab }: { user: string; tab: string },
  connection: string,
  at: Date,
): Promise<void> {
  return insertEvent(
    { user, connection, tab },
    { signal: "close" },
    `${connection}:close`,
    at,
  );
}

interface ConnectionHandle {
  id: string;
  onClose(callback: () => void): void;
}

interface Marker {
  user: string;
  tab: string;
  // Promise that resolves when the tab's context event has been written
  written: Promise<void>;
}

// Keep track of the tab each connection last reported, keyed by the connection
// itself, so that we can append its close. (Cleaned up by the close event
// handlers)
const markers = new Map<ConnectionHandle, Marker>();
// Whether each marked connection's disconnect close has run
const connectionClosed = new WeakMap<ConnectionHandle, boolean>();

// Forget the connection's marker, returning it once its context event has been
// written
async function forgetMarker(
  connection: ConnectionHandle,
): Promise<Marker | undefined> {
  const marker = markers.get(connection);
  // Forget the marker before awaiting anything, so that a new report on this
  // connection isn't what gets closed.
  markers.delete(connection);
  // The context event's write can still be in flight
  await marker?.written.catch(() => undefined);
  return marker;
}

// Append the close for whatever tab the connection last reported.
export async function closeConnection(
  connection: ConnectionHandle,
): Promise<void> {
  const marker = await forgetMarker(connection);
  if (marker) {
    await appendClose(
      { user: marker.user, tab: marker.tab },
      connection.id,
      new Date(),
    );
  }
}

// Stop tracking a connection that's still open, appending the close for the tab
// it last reported
export async function untrackConnection(
  connection: ConnectionHandle,
  reason: string,
): Promise<void> {
  const marker = await forgetMarker(connection);
  if (!marker) {
    return;
  }
  await insertEvent(
    { user: marker.user, connection: connection.id, tab: marker.tab },
    { signal: "close" },
    // Distinct from the `${connection}:close` that gets used if the connection
    // reports again.
    `${connection.id}:${reason}:${Random.id()}`,
    new Date(),
  );
}

// Record the tab a connection is reporting for, and register the disconnect
// close exactly once.
export function markConnection(
  connection: ConnectionHandle,
  marker: Marker,
): void {
  markers.set(connection, marker);
  if (!connectionClosed.has(connection)) {
    connectionClosed.set(connection, false);
    connection.onClose(() => {
      connectionClosed.set(connection, true);
      void closeConnection(connection).catch((error) => {
        Logger.warn("Failed to append attention close on disconnect", {
          error,
        });
      });
    });
  }
}

// Connections stay open across a logout, so close the tab now rather than
// waiting for the disconnect. (They might log back in.)
Accounts.onLogout(({ connection }: { connection: ConnectionHandle }) => {
  void untrackConnection(connection, "logout").catch((error) => {
    Logger.warn("Failed to append attention close on logout", { error });
  });
});

// Logging in as someone else doesn't log out first, so close out the previous
// user's tab
Accounts.onLogin(
  ({
    connection,
    user,
  }: {
    connection: ConnectionHandle;
    user: Meteor.User;
  }) => {
    if (markers.get(connection)?.user === user._id) {
      return;
    }
    void untrackConnection(connection, "login").catch((error) => {
      Logger.warn("Failed to append attention close on login", { error });
    });
  },
);

// Close out every tab on shutdown, since the dead-server sweep doesn't run
// until a couple of minutes after the server stops
onExit(async () => {
  await Promise.all(
    [...markers.keys()].map((connection) =>
      untrackConnection(connection, "shutdown"),
    ),
  );
});

// Mirrors the `disable.attention_reporting` circuit breaker
let reportingDisabled = false;

export function acceptingReports(connection: ConnectionHandle): boolean {
  return !reportingDisabled && connectionClosed.get(connection) !== true;
}

Meteor.startup(async () => {
  await Flags.observeChangesAsync("disable.attention_reporting", (disabled) => {
    reportingDisabled = disabled;
    if (!disabled) {
      return;
    }
    for (const connection of markers.keys()) {
      void untrackConnection(connection, "breaker").catch((error) => {
        Logger.warn("Failed to append attention close for circuit breaker", {
          error,
        });
      });
    }
  });
});

// When a server dies, its open connections never get cleaned up by
// closeConnection, so append a close for each one still open (idempotent via
// the dedupKey).
registerPeriodicCleanupHook(async (deadServer) => {
  const openTabs = new Map<string, AttentionTransitionType>();
  for await (const transition of AttentionTransitions.find(
    { server: deadServer, signal: { $in: ["context", "close"] } },
    { sort: { ts: 1 } },
  )) {
    const key = `${transition.user}:${transition.connection}`;
    if (transition.signal === "context") {
      openTabs.set(key, transition);
    } else {
      openTabs.delete(key);
    }
  }

  const at = new Date();
  for (const { user, tab, connection } of openTabs.values()) {
    await appendClose({ user, tab }, connection, at);
  }
});
