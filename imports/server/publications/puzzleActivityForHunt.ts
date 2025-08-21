import { check } from "meteor/check";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { PublishedBucket } from "../../lib/config/activityTracking";
import {
  ACTIVITY_COLLECTION,
  ACTIVITY_GRANULARITY,
  ACTIVITY_SEGMENTS,
} from "../../lib/config/activityTracking";
import ChatMessages from "../../lib/models/ChatMessages";
import DocumentActivities from "../../lib/models/DocumentActivities";
import puzzleActivityForHunt from "../../lib/publications/puzzleActivityForHunt";
import roundedTime from "../../lib/roundedTime";
import CallActivities from "../models/CallActivities";
import definePublication from "./definePublication";

class ActivityBucket {
  callUsers: Set<string> = new Set();

  chatUsers: Set<string> = new Set();

  allUsers: Set<string> = new Set();

  documentUsers: Set<string> = new Set();
}

type ActivityBuckets = Map<number, ActivityBucket>;

class HuntActivityAggregator {
  static aggregators = new Map<string, HuntActivityAggregator>();

  hunt: string;

  initializing: boolean;

  activitiesByPuzzle: Map<string, ActivityBuckets> = new Map();

  documentActivityHandle?: Meteor.LiveQueryHandle;

  documentActivityPromise: Promise<Meteor.LiveQueryHandle>;

  callActivityHandle?: Meteor.LiveQueryHandle;

  callActivityPromise: Promise<Meteor.LiveQueryHandle>;

  chatMessageHandle?: Meteor.LiveQueryHandle;

  chatMessagePromise: Promise<Meteor.LiveQueryHandle>;

  timeouts: Map<string, number> = new Map();

  subscriptions: Set<Subscription> = new Set();

  private constructor(hunt: string) {
    this.hunt = hunt;

    // Note that this won't update reactively, but sets a bound for the initial
    // data fetch
    const cutoff = new Date(
      Date.now() - ACTIVITY_GRANULARITY * ACTIVITY_SEGMENTS,
    );
    // All of these are sufficiently immutable that we don't need to observe
    // changes or removes
    this.initializing = true;
    this.documentActivityPromise = DocumentActivities.find({
      hunt: this.hunt,
      ts: { $gte: cutoff },
    }).observeChangesAsync({
      added: (_, fields) => {
        const { puzzle, ts } = fields;
        if (!puzzle || !ts) return;

        const [bucket, newBucket] = this.lookupBucket(puzzle, ts);
        if (!bucket) return;

        const user = fields.user ?? "__document__";
        bucket.documentUsers.add(user);
        bucket.allUsers.add(user);
        if (!this.initializing) {
          this.publishBucket(puzzle, ts, bucket, newBucket);
        }
      },
    });
    this.callActivityPromise = CallActivities.find({
      hunt: this.hunt,
      ts: { $gte: cutoff },
    }).observeChangesAsync({
      added: (_, fields) => {
        const { call: puzzle, ts, user } = fields;
        if (!puzzle || !ts || !user) return;

        const [bucket, newBucket] = this.lookupBucket(puzzle, ts);
        if (!bucket) return;

        bucket.callUsers.add(user);
        bucket.allUsers.add(user);
        if (!this.initializing) {
          this.publishBucket(puzzle, ts, bucket, newBucket);
        }
      },
    });
    this.chatMessagePromise = ChatMessages.find({
      hunt: this.hunt,
      createdAt: { $gte: cutoff },
    }).observeChangesAsync({
      added: (_, fields) => {
        const { puzzle, createdAt, sender } = fields;
        if (!puzzle || !createdAt || !sender) return;

        const ts = roundedTime(ACTIVITY_GRANULARITY, createdAt);

        const [bucket, newBucket] = this.lookupBucket(puzzle, ts);
        if (!bucket) return;

        bucket.chatUsers.add(sender);
        bucket.allUsers.add(sender);
        if (!this.initializing) {
          this.publishBucket(puzzle, ts, bucket, newBucket);
        }
      },
    });
  }

  async waitReady() {
    [
      this.documentActivityHandle,
      this.callActivityHandle,
      this.chatMessageHandle,
    ] = await Promise.all([
      this.documentActivityPromise,
      this.callActivityPromise,
      this.chatMessagePromise,
    ]);
    this.initializing = false;
  }

  bucketId(puzzle: string, ts: Date) {
    return `${this.hunt}/${puzzle}/${ts.getTime()}`;
  }

  buildBucket(
    puzzle: string,
    ts: Date,
    bucket: ActivityBucket,
  ): PublishedBucket {
    return {
      _id: this.bucketId(puzzle, ts),
      hunt: this.hunt,
      puzzle,
      ts,
      totalUsers: bucket.allUsers.size,
      chatUsers: bucket.chatUsers.size,
      callUsers: bucket.callUsers.size,
      documentUsers: bucket.documentUsers.size,
    };
  }

  publishBucket(
    puzzle: string,
    ts: Date,
    bucket: ActivityBucket,
    newBucket: boolean,
  ) {
    const publishedBucket = this.buildBucket(puzzle, ts, bucket);
    if (newBucket) {
      this.added(publishedBucket._id, publishedBucket);
    } else {
      this.changed(publishedBucket._id, publishedBucket);
    }
  }

  close() {
    this.documentActivityHandle?.stop();
    this.callActivityHandle?.stop();
    this.chatMessageHandle?.stop();
    this.timeouts.forEach((timeout) => Meteor.clearTimeout(timeout));
    this.timeouts.clear();
  }

  added(id: string, fields: PublishedBucket) {
    this.subscriptions.forEach((sub) =>
      sub.added(ACTIVITY_COLLECTION, id, fields),
    );
  }

  changed(id: string, fields: PublishedBucket) {
    this.subscriptions.forEach((sub) =>
      sub.changed(ACTIVITY_COLLECTION, id, fields),
    );
  }

  removed(id: string) {
    this.subscriptions.forEach((sub) => sub.removed(ACTIVITY_COLLECTION, id));
  }

  lookupPuzzle(puzzle: string) {
    let buckets = this.activitiesByPuzzle.get(puzzle);
    if (!buckets) {
      buckets = new Map();
      this.activitiesByPuzzle.set(puzzle, buckets);
    }
    return buckets;
  }

  lookupBucket(
    puzzle: string,
    time: Date,
  ): [activity: ActivityBucket | undefined, newBucket: boolean] {
    // If the bucket has already expired, short-circuit.
    const expiration =
      time.getTime() + ACTIVITY_GRANULARITY * ACTIVITY_SEGMENTS;
    if (expiration < Date.now()) {
      return [undefined, false];
    }

    const buckets = this.lookupPuzzle(puzzle);

    let bucket = buckets.get(time.getTime());
    if (bucket) {
      return [bucket, false];
    }

    bucket = new ActivityBucket();
    buckets.set(time.getTime(), bucket);
    const timeout = Meteor.setTimeout(() => {
      this.garbageCollect(puzzle, time);
    }, expiration - Date.now());
    this.timeouts.set(this.bucketId(puzzle, time), timeout);
    return [bucket, true];
  }

  garbageCollect(puzzle: string, time: Date) {
    const buckets = this.lookupPuzzle(puzzle);
    buckets.delete(time.getTime());
    this.removed(this.bucketId(puzzle, time));
    this.timeouts.delete(this.bucketId(puzzle, time));
  }

  static async get(hunt: string) {
    let aggregator = HuntActivityAggregator.aggregators.get(hunt);
    if (!aggregator) {
      aggregator = new HuntActivityAggregator(hunt);
      HuntActivityAggregator.aggregators.set(hunt, aggregator);
    }
    await aggregator.waitReady();
    return aggregator;
  }

  addSubscription(sub: Subscription) {
    this.subscriptions.add(sub);

    this.activitiesByPuzzle.forEach((buckets, puzzle) => {
      buckets.forEach((bucket, ts) => {
        const publishedBucket = this.buildBucket(puzzle, new Date(ts), bucket);
        sub.added(ACTIVITY_COLLECTION, publishedBucket._id, publishedBucket);
      });
    });
    sub.ready();

    sub.onStop(() => {
      this.subscriptions.delete(sub);
      if (this.subscriptions.size === 0) {
        this.close();
        HuntActivityAggregator.aggregators.delete(this.hunt);
      }
    });
  }
}

definePublication(puzzleActivityForHunt, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    const aggregator = await HuntActivityAggregator.get(huntId);
    aggregator.addSubscription(this);
    return undefined;
  },
});
