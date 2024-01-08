import { EJSON } from "meteor/ejson";
import type { Meteor, Subscription } from "meteor/meteor";

// Allow having multiple processes independently publishing data over a single
// subscription. This logic heavily borriws the behavior of Meteor in
// `packages/ddp-server/livedata_server.js`, but that only works across multiple
// independent publications, not a single publication that is pushing out
// multiple overlapping datasets

class DocumentView {
  handles: Set<Subscription> = new Set();

  data: Map<string /* key */, { handle: Subscription; value: any }[]> =
    new Map();

  render() {
    const rendered: Record<string, any> = {};
    for (const [key, values] of this.data.entries()) {
      rendered[key] = values[0]!.value;
    }
    return rendered;
  }

  clearField(
    handle: Subscription,
    key: string,
    accumulator: Record<string, any>,
  ) {
    if (key === "_id") return;

    const values = this.data.get(key);
    if (!values) return;

    let removedValue: any;
    values.some(({ handle: valueHandle, value }, i) => {
      if (valueHandle === handle) {
        if (i === 0) removedValue = value;
        values.splice(i, 1);
        return true;
      }
      return false;
    });

    if (values.length === 0) {
      this.data.delete(key);
      accumulator[key] = undefined;
    } else if (
      removedValue !== undefined &&
      !EJSON.equals(removedValue, values[0]!.value)
    ) {
      accumulator[key] = values[0]!.value;
    }
  }

  changeField(
    handle: Subscription,
    key: string,
    providedValue: any,
    accumulator: Record<string, any>,
    isAdd = false,
  ) {
    if (key === "_id") return;

    const value = EJSON.clone(providedValue);

    const values = this.data.get(key);
    if (!values) {
      this.data.set(key, [{ handle, value }]);
      accumulator[key] = value;
      return;
    }

    const existing = isAdd
      ? undefined
      : values.find(({ handle: valueHandle }) => valueHandle === handle);
    if (existing) {
      if (existing === values[0] && !EJSON.equals(existing.value, value)) {
        accumulator[key] = value;
      }
      existing.value = value;
    } else {
      values.push({ handle, value });
    }
  }
}

class CollectionView {
  name: string;

  callbacks: Pick<Subscription, "added" | "changed" | "removed">;

  documents: Map<string /* id */, DocumentView> = new Map();

  constructor(
    name: string,
    callbacks: Pick<Subscription, "added" | "changed" | "removed">,
  ) {
    this.name = name;
    this.callbacks = callbacks;
  }

  removeSubscription(handle: Subscription) {
    for (const [id, document] of this.documents.entries()) {
      if (document.handles.has(handle)) {
        this.removed(handle, id);
      }
    }
  }

  added(handle: Subscription, id: string, fields: Record<string, any>) {
    let document = this.documents.get(id);
    let added = false;
    if (!document) {
      added = true;
      document = new DocumentView();
      this.documents.set(id, document);
    }

    document.handles.add(handle);

    const changes: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      document.changeField(handle, key, value, changes, true);
    }
    if (added) {
      this.callbacks.added(this.name, id, changes);
    } else {
      this.callbacks.changed(this.name, id, changes);
    }
  }

  changed(handle: Subscription, id: string, fields: Record<string, any>) {
    const changes: Record<string, any> = {};
    const document = this.documents.get(id);
    if (!document) {
      throw new Error("changed called on unpublished document");
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) {
        document.clearField(handle, key, changes);
      } else {
        document.changeField(handle, key, value, changes);
      }
    }
    this.callbacks.changed(this.name, id, changes);
  }

  removed(handle: Subscription, id: string) {
    const document = this.documents.get(id);
    if (!document) {
      throw new Error("removed called on unpublished document");
    }
    document.handles.delete(handle);
    if (document.handles.size === 0) {
      this.documents.delete(id);
      this.callbacks.removed(this.name, id);
    } else {
      const changes: Record<string, any> = {};
      for (const key of document.data.keys()) {
        document.clearField(handle, key, changes);
      }
      this.callbacks.changed(this.name, id, changes);
    }
  }
}

class SubSubscription implements Subscription {
  merger: PublicationMerger;

  connection: Meteor.Connection;

  userId: string | null;

  stopCallbacks: (() => void)[] = [];

  stopped = false;

  constructor(merger: PublicationMerger) {
    this.merger = merger;
    this.connection = merger.mainSub.connection;
    this.userId = merger.mainSub.userId;
  }

  added(collection: string, id: string, fields: Record<string, any>): void {
    if (!this.stopped) {
      this.merger.added(this, collection, id, fields);
    }
  }

  changed(collection: string, id: string, fields: Record<string, any>): void {
    if (!this.stopped) {
      this.merger.changed(this, collection, id, fields);
    }
  }

  removed(collection: string, id: string): void {
    if (!this.stopped) {
      this.merger.removed(this, collection, id);
    }
  }

  onStop(callback: () => void): void {
    this.stopCallbacks.push(callback);
  }

  ready(): void {
    throw new Error("ready not supported on PublicationMerger subs");
  }

  error(error: Error): void {
    this.merger.mainSub.error(error);
  }

  stop(): void {
    this.merger.removeSub(this);
  }

  unblock(): void {
    /* noop - not clear how to combine this across multiple subs */
  }
}

export type { SubSubscription };

export default class PublicationMerger {
  mainSub: Subscription;

  subs: Set<SubSubscription> = new Set();

  collectionViews: Map<string, CollectionView> = new Map();

  constructor(mainSub: Subscription) {
    this.mainSub = mainSub;
    this.mainSub.onStop(() => {
      this.subs.forEach((sub) => {
        sub.stopCallbacks.forEach((cb) => cb());
      });
    });
  }

  newSub(): SubSubscription {
    const sub = new SubSubscription(this);
    this.subs.add(sub);
    return sub;
  }

  removeSub(handle: SubSubscription) {
    handle.stopCallbacks.forEach((cb) => cb());
    for (const collectionView of this.collectionViews.values()) {
      collectionView.removeSubscription(handle);
      if (collectionView.documents.size === 0) {
        this.collectionViews.delete(collectionView.name);
      }
    }
    this.subs.delete(handle);
    handle.stopped = true;
  }

  added(
    handle: Subscription,
    collection: string,
    id: string,
    fields: Record<string, any>,
  ) {
    let collectionView = this.collectionViews.get(collection);
    if (!collectionView) {
      collectionView = new CollectionView(collection, this.mainSub);
      this.collectionViews.set(collection, collectionView);
    }
    collectionView.added(handle, id, fields);
  }

  changed(
    handle: Subscription,
    collection: string,
    id: string,
    fields: Record<string, any>,
  ) {
    const collectionView = this.collectionViews.get(collection);
    if (!collectionView) {
      throw new Error("changed called on unpublished collection");
    }
    collectionView.changed(handle, id, fields);
  }

  removed(handle: Subscription, collection: string, id: string) {
    const collectionView = this.collectionViews.get(collection);
    if (!collectionView) {
      throw new Error("removed called on unpublished collection");
    }
    collectionView.removed(handle, id);
    if (collectionView.documents.size === 0) {
      this.collectionViews.delete(collection);
    }
  }
}
