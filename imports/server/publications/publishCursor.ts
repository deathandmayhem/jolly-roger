import type { Subscription } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";

// Useful if you want to publish a mix of cursors but also manually publish some
// other dataset
export default async function publishCursor<T>(
  sub: Subscription,
  name: string,
  cursor: Mongo.Cursor<T>,
  transform: (v: Partial<T>) => Partial<T> = (v) => v,
) {
  const watcher = await cursor.observeChangesAsync({
    added: (id, fields) => sub.added(name, id, transform(fields)),
    changed: (id, fields) => sub.changed(name, id, transform(fields)),
    removed: (id) => sub.removed(name, id),
  });
  sub.onStop(() => watcher.stop());
}
