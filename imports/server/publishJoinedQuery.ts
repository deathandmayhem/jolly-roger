import { isDeepStrictEqual } from "node:util";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import type { z } from "zod";
import Logger from "../Logger";
import type { MongoRecordZodType } from "../lib/models/generateJsonSchema";
import type Model from "../lib/models/Model";

type Projection<T> = Partial<Record<keyof T, 0 | 1>>;

// Sadly, this type declaration doesn't do us much good beyond the first level.
// The PublishSpec<any> doesn't trigger inference, but is actually treated as
// "any", meaning that second-and-beyond level fields are more or less
// unconstrained. I think that to do better, we'd have to somehow materialize
// the types of the subsequent levels in the generic parameters to PublishSpec,
// effectively building the tree in the generic parameters. I'm not entirely
// sure how to actually do that.
export type PublishSpec<T extends { _id: string }> = {
  model:
    | Mongo.Collection<T>
    | Model<z.ZodType<T, any, any> & MongoRecordZodType>;
  allowDeleted?: boolean;
  projection?: Projection<T>;
  foreignKeys?: {
    field: keyof T & string;
    join: PublishSpec<any>;
  }[];
  lingerTime?: number;
};

function modelName(model: Mongo.Collection<any> | Model<any>) {
  return model instanceof Mongo.Collection ? model._name : model.name;
}

class RefCountedJoinedObjectObserverMap<T extends { _id: string }> {
  sub: Subscription;

  subscribers: Map<
    string,
    { refCount: number; subscriber: JoinedObjectObserver<T> }
  > = new Map();

  spec: PublishSpec<T>;

  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>;

  constructor(
    sub: Subscription,
    spec: PublishSpec<T>,
    observers: Map<string, RefCountedJoinedObjectObserverMap<any>>,
  ) {
    this.sub = sub;
    this.spec = spec;
    this.observers = observers;
  }

  async incref(id: string) {
    if (this.subscribers.has(id)) {
      this.subscribers.get(id)!.refCount += 1;
    } else {
      const subscriber = new JoinedObjectObserver(
        this.sub,
        this.spec,
        id,
        this.observers,
      );
      this.subscribers.set(id, {
        refCount: 1,
        subscriber,
      });
      await subscriber.readyPromise();
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
    this.subscribers = new Map();
  }
}

const finder = (
  model: Mongo.Collection<any> | Model<any>,
  allowDeleted: boolean | undefined,
) => {
  return allowDeleted &&
    "findAllowingDeleted" in model &&
    typeof model.findAllowingDeleted === "function"
    ? (model.findAllowingDeleted.bind(model) as typeof model.find)
    : model.find.bind(model);
};

class JoinedObjectObserver<T extends { _id: string }> {
  sub: Subscription;

  id: string;

  modelName: string;

  foreignKeys?: PublishSpec<T>["foreignKeys"];

  initialBlockers: Promise<void>[];

  watcherPromise: Promise<Meteor.LiveQueryHandle>;

  exists = false;

  observers: Map<string, RefCountedJoinedObjectObserverMap<any>>;

  // key: document ID.  value: map of foreign key field name to list of values
  values: Map<string, Map<string, string[]>> = new Map();

  constructor(
    sub: Subscription,
    spec: PublishSpec<T>,
    id: string,
    observers: Map<string, RefCountedJoinedObjectObserverMap<any>>,
  ) {
    const { model, allowDeleted, projection, foreignKeys } = spec;

    this.sub = sub;
    this.id = id;
    this.modelName = modelName(model);
    this.foreignKeys = foreignKeys;
    this.observers = observers;

    let observeReady = false;
    this.initialBlockers = [];
    this.watcherPromise = finder(model, allowDeleted)(id, {
      projection: projection as Mongo.FieldSpecifier,
    }).observeChangesAsync({
      added: (_, fields) => {
        const fkValues = new Map<string, string[]>();
        const promises: Promise<void>[] = [];
        foreignKeys?.forEach(({ field, join }) => {
          let val = fields[field] as unknown as undefined | string | string[];
          if (!val) {
            return;
          }

          if (!Array.isArray(val)) {
            val = [val];
          }

          const observer = this.observers.get(modelName(join.model))!;
          val.forEach((v) => {
            const promise = observer.incref(v);
            // Ensure we don't .added() until the join incref()s are done
            promises.push(promise);
            // Also ensure we don't mark ourself as ready until the increfs are done
            if (!observeReady) {
              this.initialBlockers.push(promise);
            }
          });
          fkValues.set(field, val);
        });

        Promise.all(promises).then(
          () => {
            // console.log(`added ${this.modelName} ${this.id}`);
            this.sub.added(this.modelName, id, fields);
            this.exists = true;
            this.values.set(id, fkValues);
          },
          (err) => {
            // biome-ignore lint/suspicious/noConsole: migration from eslint
            console.log("incref promise rejected:", err);
          },
        );
      },
      changed: (_, fields) => {
        // add new foreign keys first
        const promises: Promise<void>[] = [];
        foreignKeys?.forEach(({ field, join }) => {
          let val = fields[field] as unknown as undefined | string | string[];
          if (!val) {
            // no change to foreign key for `field`
            return;
          }

          if (!Array.isArray(val)) {
            val = [val];
          }

          const observer = this.observers.get(modelName(join.model))!;
          val.forEach((v) => {
            promises.push(observer.incref(v));
          });
        });
        Promise.all(promises).then(
          () => {
            this.sub.changed(this.modelName, id, fields);

            // then remove old foreign key values
            const fkValues = this.values.get(id)!;
            foreignKeys?.forEach(({ field, join }) => {
              // Only remove foreign key values that actually got updated to undefined
              if (Object.hasOwn(fields, field)) {
                const val = fkValues.get(field);
                if (!val) {
                  // Nothing to decref -- foreign key was absent previously.
                  return;
                }

                const observer = this.observers.get(modelName(join.model))!;
                if (join.lingerTime !== undefined) {
                  Meteor.setTimeout(() => {
                    val.forEach((v) => observer.decref(v));
                  }, join.lingerTime);
                } else {
                  val.forEach((v) => observer.decref(v));
                }
              }
            });

            // finally update this.values (through inner object fkValues)
            foreignKeys?.forEach(({ field }) => {
              if (Object.hasOwn(fields, field)) {
                const val = fields[field] as unknown as
                  | undefined
                  | string
                  | string[];
                if (!val) {
                  fkValues.delete(field);
                } else {
                  fkValues.set(field, Array.isArray(val) ? val : [val]);
                }
              }
            });
          },
          (err) => {
            // biome-ignore lint/suspicious/noConsole: migration from eslint
            console.log("incref promise rejected:", err);
          },
        );
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

          const observer = this.observers.get(modelName(join.model))!;
          val.forEach((v) => observer.decref(v));
        });
        this.values.delete(id);
      },
    });
    this.watcherPromise.then(
      () => {
        observeReady = true;
      },
      (error) => {
        Logger.error("JoinedObjectObserver watcherPromise error", {
          error,
          model: this.modelName,
          id: this.id,
        });
        this.sub.error(error);
      },
    );
  }

  async readyPromise() {
    await this.watcherPromise;
    // We must not read this.initialBlockers until this.watcherPromise has
    // resolved, or it might not yet be fully populated with all the promises
    // we need to block on.
    return Promise.all(this.initialBlockers).then(() => {
      // Just a void promise
    });
  }

  destroy() {
    this.watcherPromise.then(
      (watcher) => {
        watcher.stop();
      },
      (error) => {
        Logger.error("JoinedObjectObserver watcherPromise error in teardown", {
          error,
          model: this.modelName,
          id: this.id,
        });
        this.sub.error(error);
      },
    );
    if (this.exists) {
      this.sub.removed(this.modelName, this.id);
      const fkValues = this.values.get(this.id)!;
      this.foreignKeys?.forEach(({ field, join }) => {
        const val = fkValues.get(field);
        if (!val) {
          return;
        }

        const observer = this.observers.get(modelName(join.model))!;
        val.forEach((v) => observer.decref(v));
      });
    }
  }
}

const validateSpec = (spec: PublishSpec<any>) => {
  const { model, allowDeleted, projection, foreignKeys } = spec;
  if (projection && foreignKeys?.some(({ field }) => !projection[field])) {
    throw new Error(
      `JoinPublisher: projection for model ${modelName(
        model,
      )} must include all foreign keys`,
    );
  }

  if (allowDeleted && !("findAllowingDeleted" in model)) {
    throw new Error(
      `JoinPublisher: model ${modelName(model)} does not support soft deletion`,
    );
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
  if (
    projections.has(modelName(model)) &&
    !isDeepStrictEqual(projections.get(modelName(model)), projection)
  ) {
    throw new Error(
      `JoinPublisher: different projections specified for same model ${modelName(
        model,
      )}`,
    );
  }
  projections.set(modelName(model), projection);

  if (!observers.has(modelName(model))) {
    observers.set(
      modelName(model),
      new RefCountedJoinedObjectObserverMap(sub, spec, observers),
    );
  }

  foreignKeys?.forEach(({ join }) => {
    addObservers(sub, join, observers, projections);
  });
};

export default async function publishJoinedQuery<T extends { _id: string }>(
  sub: Subscription,
  spec: PublishSpec<T>,
  query: Mongo.Selector<T>,
): Promise<void> {
  validateSpec(spec);

  const observers = new Map<string, RefCountedJoinedObjectObserverMap<any>>();
  addObservers(sub, spec, observers);
  sub.onStop(() => observers.forEach((v) => v.shutdown()));

  const { model, allowDeleted } = spec;
  const name = modelName(model);

  const observer = observers.get(name)!;

  const promises: Promise<void>[] = [];
  let ready = false;
  const watcher = await finder(model, allowDeleted)(query, {
    projection: { _id: 1 },
  }).observeChangesAsync({
    added: (id) => {
      const promise = observer.incref(id);
      if (!ready) {
        promises.push(promise);
      }
    },
    removed: (id) => {
      if (spec.lingerTime !== undefined) {
        Meteor.setTimeout(() => {
          observer.decref(id);
        }, spec.lingerTime);
      } else {
        observer.decref(id);
      }
    },
  });
  ready = true;
  // The increfs and decrefs all proceed asynchronously.
  await Promise.all(promises);
  sub.onStop(() => watcher.stop());
}
