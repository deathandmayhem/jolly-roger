import type { Meteor, Subscription } from 'meteor/meteor';
import type { Mongo } from 'meteor/mongo';

declare module 'meteor/mongo' {

  namespace Mongo {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Collection<T> {
      // We can get this property from tableName on our models, but we need this
      // for models that don't descend from Base, like Meteor.users
      _name: string;
    }
  }
}

export default class SwappableCursorPublisher<T extends { _id: string }> {
  sub: Subscription;

  collection: string;

  watcher?: Meteor.LiveQueryHandle;

  objects: Map<string, Partial<T>> = new Map();

  constructor(sub: Subscription, model: Mongo.Collection<T>) {
    this.sub = sub;
    this.collection = model._name;
  }

  swap(cursor?: Mongo.Cursor<T>, transform: (v: Partial<T>) => Partial<T> = (v) => v) {
    const newObjects = new Map<string, Partial<T>>();

    let initializing = true;
    const newWatcher = cursor?.observeChanges({
      added: (id, fields) => {
        const transformedFields = transform(fields);
        if (initializing) {
          newObjects.set(id, transformedFields);
          const oldObject = this.objects.get(id);
          if (oldObject) {
            this.sub.changed(
              this.collection,
              id,
              {
                ...Object.fromEntries(Object.keys(oldObject).map((k) => [k, undefined])),
                ...transformedFields,
              },
            );
            return;
          }
        }

        // if not initializing or we didn't have the object before, add like
        // normal
        this.sub.added(this.collection, id, transformedFields);
      },
      changed: (id, fields) => {
        const transformedFields = transform(fields);
        this.sub.changed(this.collection, id, transformedFields);
        this.objects.set(id, { ...this.objects.get(id), ...transformedFields });
      },
      removed: (id) => {
        this.sub.removed(this.collection, id);
        this.objects.delete(id);
      },
    });
    initializing = false;
    this.objects.forEach((_, k) => {
      if (!newObjects.has(k)) {
        this.sub.removed(this.collection, k);
      }
    });
    this.objects = newObjects;
    this.watcher?.stop();
    this.watcher = newWatcher;
  }

  stop() {
    this.watcher?.stop();
  }
}
