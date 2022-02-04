/* eslint no-underscore-dangle: ["error", {allow: ["_name"]}] */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { isDeepStrictEqual } from 'util';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

declare module 'meteor/mongo' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  namespace Mongo {
    interface Collection<T> {
      // We can get this property from tableName on our models, but we need this
      // for models that don't descend from Base, like Meteor.users
      _name: string;
    }
  }
}

type Projection<T> = Partial<Record<keyof T, 0 | 1>>;

// Sadly, this type declaration doesn't do us much good beyond the first level.
// The PublishSpec<any> doesn't trigger inference, but is actually treated as
// "any", meaning that second-and-beyond level fields are more or less
// unconstrained. I think that to do better, we'd have to somehow materialize
// the types of the subsequent levels in the generic parameters to PublishSpec,
// effectively building the tree in the generic parameters. I'm not entirely
// sure how to actually do that.
export type PublishSpec<T extends { _id: string }> = {
  model: Mongo.Collection<T>,
  projection?: Projection<T>,
  foreignKeys?: {
    field: keyof T & string;
    join: PublishSpec<any>,
  }[];
}

class RefCountedJoinedObjectObserverMap<T extends { _id: string }> {
  sub: Subscription;

  subscribers: Map<string, { refCount: number, subscriber: JoinedObjectObserver<T> }> = new Map();

  spec: PublishSpec<T>;

  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>;

  constructor(
    sub: Subscription,
    spec: PublishSpec<T>,
    observers: Map<string, RefCountedJoinedObjectObserverMap<any>>
  ) {
    this.sub = sub;
    this.spec = spec;
    this.observers = observers;
  }

  incref(id: string) {
    if (this.subscribers.has(id)) {
      this.subscribers.get(id)!.refCount += 1;
    } else {
      this.subscribers.set(id, {
        refCount: 1,
        subscriber: new JoinedObjectObserver(this.sub, this.spec, id, this.observers),
      });
    }
  }

  decref(id: string) {
    const record = this.subscribers.get(id);
    if (!record) {
      return;
    }
    record.refCount -= 1;
    if (record.refCount <= 0) {
      record.subscriber.destroy();
      this.subscribers.delete(id);
    }
  }

  shutdown() {
    this.subscribers.forEach((v) => v.subscriber.destroy());
  }
}

class JoinedObjectObserver<T extends { _id: string }> {
  sub: Subscription;

  id: string;

  modelName: string;

  foreignKeys?: PublishSpec<T>['foreignKeys'];

  watcher: Meteor.LiveQueryHandle;

  exists: boolean = false;

  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>;

  values: Map<string, Map<string, string>> = new Map();

  constructor(
    sub: Subscription,
    spec: PublishSpec<T>,
    id: string,
    observers: Map<string, RefCountedJoinedObjectObserverMap<any>>
  ) {
    const { model, projection, foreignKeys } = spec;

    this.sub = sub;
    this.id = id;
    this.modelName = model._name;
    this.foreignKeys = foreignKeys;
    this.observers = observers;

    this.watcher = model.find(id, { fields: projection as Mongo.FieldSpecifier }).observeChanges({
      added: (_, fields) => {
        const fkValues = new Map<string, string>();
        foreignKeys?.forEach(({ field, join }) => {
          const val = fields[field] as unknown as string;
          if (!val) {
            return;
          }

          this.observers.get(join.model._name)!.incref(val);
          fkValues.set(field, val);
        });

        this.sub.added(this.modelName, id, fields);
        this.exists = true;
        this.values.set(id, fkValues);
      },
      changed: (_, fields) => {
        // add new foreign keys first
        foreignKeys?.forEach(({ field, join }) => {
          const val = fields[field] as unknown as string;
          if (!val) {
            return;
          }

          this.observers.get(join.model._name)!.incref(val);
        });
        this.sub.changed(this.modelName, id, fields);

        // then remove old foreign key values
        const fkValues = this.values.get(id)!;
        foreignKeys?.forEach(({ field, join }) => {
          const val = fkValues.get(field);
          if (!val) {
            return;
          }

          this.observers.get(join.model._name)!.decref(val);
        });

        // finally update this.values
        foreignKeys?.forEach(({ field }) => {
          const val = fields[field] as unknown as string;
          if (!val) {
            return;
          }
          fkValues.set(field, val);
        });
      },
      removed: (_) => {
        // remove the object first, then decref its foreign keys
        this.sub.removed(this.modelName, id);
        this.exists = false;

        const fkValues = this.values.get(id)!;
        foreignKeys?.forEach(({ field, join }) => {
          const val = fkValues.get(field);
          if (!val) {
            return;
          }

          this.observers.get(join.model._name)!.decref(val);
        });
        this.values.delete(id);
      },
    });
  }

  destroy() {
    this.watcher.stop();
    if (this.exists) {
      this.sub.removed(this.modelName, this.id);
      const fkValues = this.values.get(this.id)!;
      this.foreignKeys?.forEach(({ field, join }) => {
        const val = fkValues.get(field);
        if (!val) {
          return;
        }

        this.observers.get(join.model._name)!.decref(val);
      });
    }
  }
}

const validateSpec = (spec: PublishSpec<any>) => {
  const { model, projection, foreignKeys } = spec;
  if (projection && foreignKeys?.some(({ field }) => !projection[field])) {
    throw new Error(`JoinPublisher: projection for model ${model} must include all foreign keys`);
  }

  foreignKeys?.forEach(({ join }) => {
    validateSpec(join);
  });
};

const addObservers = (
  sub: Subscription,
  spec: PublishSpec<any>,
  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>,
  projections: Map<string, Projection<any> | undefined> = new Map(),
) => {
  const { model, projection, foreignKeys } = spec;
  if (projections.has(model._name) &&
      !isDeepStrictEqual(projections.get(model._name), projection)) {
    throw new Error(`JoinPublisher: different projections specified for same model ${model}`);
  }
  projections.set(model._name, projection);

  if (!observers.has(model._name)) {
    observers.set(model._name, new RefCountedJoinedObjectObserverMap(sub, spec, observers));
  }

  foreignKeys?.forEach(({ join }) => {
    addObservers(sub, join, observers, projections);
  });
};

export default class JoinPublisher<T extends { _id: string }> {
  watcher: Meteor.LiveQueryHandle;

  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>;

  constructor(sub: Subscription, spec: PublishSpec<T>, query: Mongo.Selector<T>) {
    validateSpec(spec);

    this.observers = new Map<string, RefCountedJoinedObjectObserverMap<any>>();
    addObservers(sub, spec, this.observers);

    const { model } = spec;
    const { _name: name } = model;

    const observer = this.observers.get(name)!;

    this.watcher = model.find(query, {
      fields: { _id: 1 },
    }).observeChanges({
      added: (id) => {
        observer.incref(id);
      },
      removed: (id) => {
        observer.decref(id);
      },
    });

    sub.ready();
  }

  shutdown() {
    this.watcher.stop();
    this.observers.forEach((v) => v.shutdown());
  }
}
