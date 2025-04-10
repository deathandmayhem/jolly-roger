/* eslint-disable jolly-roger/no-disallowed-sync-methods */
import { check, Match } from "meteor/check";
import type { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import CallActivities from "../../lib/models/CallActivities";
import ChatMessages from "../../lib/models/ChatMessages";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Puzzles from "../../lib/models/Puzzles";
import ActivitySummaryForUser from "../../lib/publications/ActivitySummaryForUser";
import definePublication from "./definePublication";

const ACTIVITY_GRAPH_COLLECTION = "activityHistorySummaries";
interface AggregatedActivityDataPoint {
  _id: string; // Unique ID for the aggregate bucket (e.g., "huntId-DOW-H-Type")
  huntId: string;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hour: number; // 0 - 23
  type: "Call" | "Chat" | "Document";
  count: number; // Number of activities in this bucket
}

definePublication(ActivitySummaryForUser, {
  validate(args) {
    check(args, {
      userId: String,
      huntIds: Match.Maybe([String]),
      excludeCallActivity: Match.Maybe(Boolean),
      excludeChatMessages: Match.Maybe(Boolean),
      excludeDocumentActivity: Match.Maybe(Boolean),
    });
    return args;
  },

  run({
    userId,
    huntIds = [],
    excludeCallActivity = false,
    excludeChatMessages = false,
    excludeDocumentActivity = false,
  }) {
    if (!this.userId || this.userId !== userId) {
      this.ready();
      return;
    }
    if (
      !excludeCallActivity === false &&
      !excludeChatMessages === false &&
      !excludeDocumentActivity === false
    ) {
      this.ready();
      return;
    }
    const aggregatedCounts = new Map<string, number>();
    const docToAggregateMap = new Map<string, string>();

    let puzzleIdsInHunts: string[] | null = null;
    if (huntIds && huntIds.length > 0) {
      puzzleIdsInHunts = Puzzles.find(
        { hunt: { $in: huntIds } },
        { fields: { _id: 1 } },
      ).map((p) => p._id);
      if (puzzleIdsInHunts.length === 0) {
        this.ready();
        return;
      }
    }

    const sub = this;
    const observerHandles: Meteor.LiveQueryHandle[] = [];

    const handleDocumentAdded = (
      doc: { _id: string; hunt?: string; [key: string]: any; createdAt: Date },
      type: AggregatedActivityDataPoint["type"],
      tsField: string,
    ) => {
      const timestamp = doc[tsField];
      const huntId = doc.hunt;
      if (!huntId || typeof huntId !== "string") {
        return;
      }
      if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
        return;
      }

      const dayOfWeek = timestamp.getUTCDay();
      const hour = timestamp.getUTCHours();
      const aggregateKey = `${huntId}-${dayOfWeek}-${hour}-${type}`;
      const originalPublishedId = `${type}-${doc._id}`;

      const currentCount = aggregatedCounts.get(aggregateKey) ?? 0;
      const newCount = currentCount + 1;
      aggregatedCounts.set(aggregateKey, newCount);
      docToAggregateMap.set(originalPublishedId, aggregateKey);

      if (newCount === 1) {
        sub.added(ACTIVITY_GRAPH_COLLECTION, aggregateKey, {
          _id: aggregateKey,
          huntId,
          dayOfWeek,
          hour,
          type,
          count: 1,
        });
      } else {
        sub.changed(ACTIVITY_GRAPH_COLLECTION, aggregateKey, {
          count: newCount,
        });
      }
    };

    const handleDocumentRemoved = (
      oldDoc: { _id: string; [key: string]: any },
      type: AggregatedActivityDataPoint["type"],
    ) => {
      const originalPublishedId = `${type}-${oldDoc._id}`;
      const aggregateKey = docToAggregateMap.get(originalPublishedId);

      if (aggregateKey) {
        const currentCount = aggregatedCounts.get(aggregateKey) || 0;
        const newCount = Math.max(0, currentCount - 1);

        docToAggregateMap.delete(originalPublishedId);

        if (newCount === 0) {
          aggregatedCounts.delete(aggregateKey);
          sub.removed(ACTIVITY_GRAPH_COLLECTION, aggregateKey);
        } else {
          aggregatedCounts.set(aggregateKey, newCount);
          sub.changed(ACTIVITY_GRAPH_COLLECTION, aggregateKey, {
            count: newCount,
          });
        }
      } else {
        /* empty */
      }
    };

    // --- Observe Collections using observe() ---

    const collectionsToObserve = [];

    const requiredFields = (tsField: string) => ({
      [tsField]: 1,
      hunt: 1,
    });
    if (!excludeCallActivity) {
      const callQuery: Mongo.Selector<typeof CallActivities> = { user: userId };
      if (puzzleIdsInHunts) callQuery.call = { $in: puzzleIdsInHunts };
      collectionsToObserve.push({
        collection: CallActivities,
        query: callQuery,
        type: "Call",
        tsField: "ts",
        fields: requiredFields("ts"),
      });
    }
    if (!excludeChatMessages) {
      const chatQuery: Mongo.Selector<typeof ChatMessages> = { sender: userId };
      if (puzzleIdsInHunts) chatQuery.puzzle = { $in: puzzleIdsInHunts };
      collectionsToObserve.push({
        collection: ChatMessages,
        query: chatQuery,
        type: "Chat",
        tsField: "createdAt",
        fields: requiredFields("createdAt"),
      });
    }
    if (!excludeDocumentActivity) {
      const docQuery: Mongo.Selector<typeof DocumentActivities> = {
        user: userId,
      };
      if (puzzleIdsInHunts) docQuery.puzzle = { $in: puzzleIdsInHunts };
      collectionsToObserve.push({
        collection: DocumentActivities,
        query: docQuery,
        type: "Document",
        tsField: "ts",
        fields: requiredFields("ts"),
      });
    }

    collectionsToObserve.forEach(
      ({ collection, query, type, tsField, fields }) => {
        const handle = collection.find(query, { fields }).observe({
          added: (document) => {
            handleDocumentAdded(
              { _id: document._id, ...document },
              type,
              tsField,
            );
          },
          changed: (newDocument, oldDocument) => {
            const oldTimestamp = oldDocument[tsField];
            const newTimestamp = newDocument[tsField];
            const oldHuntId = oldDocument.hunt;
            const newHuntId = newDocument.hunt;
            let relevantChange = false;
            if (oldTimestamp instanceof Date && newTimestamp instanceof Date) {
              if (
                oldTimestamp.getDay() !== newTimestamp.getDay() ||
                oldTimestamp.getHours() !== newTimestamp.getHours()
              ) {
                relevantChange = true;
              }
            } else if (oldTimestamp !== newTimestamp) {
              relevantChange = true;
            }

            if (oldHuntId !== newHuntId) {
              // look this check is a bit paranoid, in case huntIds ever change
              // (they shouldn't)
              relevantChange = true;
            }

            if (relevantChange) {
              handleDocumentRemoved(
                { _id: oldDocument._id, ...oldDocument },
                type,
              );
              handleDocumentAdded(
                { _id: newDocument._id, ...newDocument },
                type,
                tsField,
              );
            }
          },
          removed: (oldDocument) => {
            handleDocumentRemoved(
              { _id: oldDocument._id, ...oldDocument },
              type,
            );
          },
        });
        observerHandles.push(handle);
      },
    );

    this.ready();

    sub.onStop(() => {
      observerHandles.forEach((handle) => handle.stop());
      aggregatedCounts.clear();
      docToAggregateMap.clear();
    });
  },
});
