import { Meteor, Subscription } from 'meteor/meteor';
import Base from '../lib/models/base';
import { BaseType } from '../lib/schemas/base';

// It's easier to create one observer per object, rather than try and have a
// single observer with an $in query. It means we don't have to start/stop the
// observer. Identical queries from different users will get deduped on the
// server side, and there are relatively few operators, so this should be
// reasonably safe.
class RecordUpdateObserver<T extends BaseType> {
  sub: Subscription;

  tableName: string;

  id: string;

  handle: Meteor.LiveQueryHandle;

  exists: boolean;

  constructor(sub: Subscription, id: string, model: Base<T>) {
    this.sub = sub;
    this.tableName = model.tableName;
    this.id = id;
    this.exists = false;
    this.handle = model.find(id).observeChanges({
      added: (_, fields) => {
        this.exists = true;
        this.sub.added(model.tableName, id, fields);
      },
      changed: (_, fields) => {
        this.sub.changed(model.tableName, id, fields);
      },
      removed: () => {
        this.exists = false;
        this.sub.removed(model.tableName, id);
      },
    });
  }

  destroy() {
    if (this.exists) {
      this.sub.removed(this.tableName, this.id);
    }

    this.handle.stop();
  }
}

class RefCountedObserverMap<T extends BaseType> {
  private sub: Subscription;

  private model: Base<T>;

  private subscribers: Map<string, { refCount: number, subscriber: RecordUpdateObserver<T> }>;

  constructor(sub: Subscription, model: Base<T>) {
    this.sub = sub;
    this.model = model;
    this.subscribers = new Map();
  }

  incref(id: string) {
    if (this.subscribers.has(id)) {
      this.subscribers.get(id)!.refCount += 1;
    } else {
      this.subscribers.set(id, {
        refCount: 1,
        subscriber: new RecordUpdateObserver(this.sub, id, this.model),
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
}

export default RefCountedObserverMap;
