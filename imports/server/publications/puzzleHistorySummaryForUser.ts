/* eslint-disable jolly-roger/no-disallowed-sync-methods */
import { check, Match } from "meteor/check";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { PuzzleHistoryItem } from "../../client/UserPuzzleHistory";
import Bookmarks from "../../lib/models/Bookmarks";
import CallActivities from "../../lib/models/CallActivities";
import ChatMessages from "../../lib/models/ChatMessages";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import PuzzleHistorySummaryForUser from "../../lib/publications/PuzzleHistorySummaryForUser";
import { computeSolvedness } from "../../lib/solvedness";
import definePublication from "./definePublication";

function minDate(d1: Date | null, d2: Date | null): Date | null {
  if (!d1) return d2;
  if (!d2) return d1;
  return d1 < d2 ? d1 : d2;
}

function maxDate(d1: Date | null, d2: Date | null): Date | null {
  if (!d1) return d2;
  if (!d2) return d1;
  return d1 > d2 ? d1 : d2;
}

class UserPuzzleHistoryAggregator {
  static aggregators = new Map<string, UserPuzzleHistoryAggregator>();

  userId: string;

  puzzleHistoryMap: Map<string, PuzzleHistoryItem> = new Map();

  huntNames: Record<string, string> = {};

  tagNames: Record<string, string> = {};

  handles: Meteor.LiveQueryHandle[] = [];

  subscriptions: Set<Subscription> = new Set();

  ready = false;

  involvedPuzzleIds: Set<string> = new Set();

  private constructor(userId: string) {
    this.userId = userId;
    this.initializeLookupsAndData();
    this.initializeObservers();
    this.ready = true;
  }

  private initializeLookupsAndData() {
    Hunts.find().forEach((h) => {
      this.huntNames[h._id] = h.name;
    });
    Tags.find().forEach((t) => {
      this.tagNames[t._id] = t.name;
    });

    const userBookmarks = Bookmarks.find({ user: this.userId }).fetch();
    const userCallActivities = CallActivities.find({
      user: this.userId,
    }).fetch();
    const userChatMessages = ChatMessages.find({
      $or: [
        { sender: this.userId },
        { "content.children.userId": this.userId },
      ],
    }).fetch();
    const userDocumentActivities = DocumentActivities.find({
      user: this.userId,
    }).fetch();
    const userGuesses = Guesses.find({ createdBy: this.userId }).fetch();

    userBookmarks.forEach((b) => this.involvedPuzzleIds.add(b.puzzle));
    userCallActivities.forEach((c) => this.involvedPuzzleIds.add(c.call));
    userChatMessages.forEach((c) => this.involvedPuzzleIds.add(c.puzzle));
    userDocumentActivities.forEach((d) => this.involvedPuzzleIds.add(d.puzzle));
    userGuesses.forEach((g) => this.involvedPuzzleIds.add(g.puzzle));

    this.involvedPuzzleIds.forEach((puzzleId) => {
      this.recomputePuzzleSummary(puzzleId, true);
    });
  }

  private initializeObservers() {
    const collectionsToObserve = [
      {
        collection: Bookmarks,
        query: { user: this.userId },
        fields: { puzzle: 1, updatedAt: 1 },
        handler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
        removedHandler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
      },
      {
        collection: CallActivities,
        query: { user: this.userId },
        fields: { call: 1, ts: 1 },
        handler: (id: string, fields: { call?: string }) =>
          fields.call && this.recomputePuzzleSummary(fields.call),
        removedHandler: (id: string, fields: { call?: string }) =>
          fields.call && this.recomputePuzzleSummary(fields.call),
      },
      {
        collection: ChatMessages,
        query: {
          $or: [
            { sender: this.userId },
            { "content.children.userId": this.userId },
          ],
        },
        fields: { puzzle: 1, createdAt: 1 },
        handler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
        removedHandler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
      },
      {
        collection: DocumentActivities,
        query: { user: this.userId },
        fields: { puzzle: 1, ts: 1 },
        handler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
        removedHandler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
      },
      {
        collection: Guesses,
        query: { createdBy: this.userId },
        fields: { puzzle: 1, createdAt: 1, state: 1 },
        handler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
        removedHandler: (id: string, fields: { puzzle?: string }) =>
          fields.puzzle && this.recomputePuzzleSummary(fields.puzzle),
      },
      {
        collection: Puzzles,
        query: { _id: { $in: [...this.involvedPuzzleIds] } },
        fields: { title: 1, url: 1, hunt: 1, answers: 1, tags: 1 },
        handler: (id: string) => this.recomputePuzzleSummary(id),
        removedHandler: (id: string) => this.removePuzzleSummary(id),
      },
      {
        collection: Hunts,
        query: {},
        fields: { name: 1 },
        handler: (id: string, fields: { name?: string }) =>
          fields.name && this.recomputeForHuntChange(id, fields.name),
        removedHandler: (id: string) => this.recomputeForHuntChange(id, null),
      },
      {
        collection: Tags,
        query: {},
        fields: { name: 1 },
        handler: (id: string, fields: { name?: string }) =>
          fields.name && this.recomputeForTagChange(id, fields.name),
        removedHandler: (id: string) => this.recomputeForTagChange(id, null),
      },
    ];

    collectionsToObserve.forEach(
      ({ collection, query, fields, handler, removedHandler }) => {
        this.handles.push(
          collection.find(query, { fields }).observeChanges({
            added: (id, docFields) => {
              const puzzleId =
                docFields.puzzle ?? (docFields as { call?: string }).call;
              if (
                puzzleId &&
                !this.involvedPuzzleIds.has(puzzleId) &&
                collection !== Puzzles &&
                collection !== Hunts &&
                collection !== Tags
              ) {
                this.involvedPuzzleIds.add(puzzleId);
                this.addPuzzleObserver(puzzleId);
              }
              handler(id, docFields);
            },
            changed: handler,
            removed: (id, docFields) => {
              if (removedHandler) {
                removedHandler(id, docFields);
              } else {
                const puzzleId =
                  docFields.puzzle ?? (docFields as { call?: string }).call;
                if (puzzleId) {
                  this.recomputePuzzleSummary(puzzleId);
                }
              }
            },
          }),
        );
      },
    );
  }

  private addPuzzleObserver(puzzleId: string) {
    const puzzleHandle = Puzzles.find(
      { _id: puzzleId },
      { fields: { title: 1, url: 1, hunt: 1, answers: 1, tags: 1 } },
    ).observeChanges({
      changed: (id) => this.recomputePuzzleSummary(id),
      removed: (id) => this.removePuzzleSummary(id),
    });
    this.handles.push(puzzleHandle);
  }

  private recomputePuzzleSummary(puzzleId: string, initializing = false) {
    if (!this.involvedPuzzleIds.has(puzzleId)) {
      if (this.puzzleHistoryMap.has(puzzleId)) {
        this.removePuzzleSummary(puzzleId);
      }
      return;
    }

    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) {
      this.removePuzzleSummary(puzzleId);
      return;
    }

    const activities = [
      ...Bookmarks.find({ user: this.userId, puzzle: puzzleId }).map((b) => ({
        type: "bookmark" as const,
        ts: b.updatedAt,
      })),
      ...CallActivities.find({ user: this.userId, call: puzzleId }).map(
        (c) => ({ type: "call" as const, ts: c.ts }),
      ),
      ...ChatMessages.find({
        puzzle: puzzleId,
        $or: [
          { sender: this.userId },
          { "content.children.userId": this.userId },
        ],
      }).map((c) => ({ type: "chat" as const, ts: c.createdAt })),
      ...DocumentActivities.find({ user: this.userId, puzzle: puzzleId }).map(
        (d) => ({ type: "document" as const, ts: d.ts }),
      ),
      ...Guesses.find({ createdBy: this.userId, puzzle: puzzleId }).map(
        (g) => ({
          type: "guess" as const,
          ts: g.createdAt,
          correct: g.state === "correct",
        }),
      ),
    ];

    if (activities.length === 0) {
      // At the moment there's no way for this to disappear in many (most?)
      // cases since only bookmark can be deleted
      this.removePuzzleSummary(puzzleId);
      this.involvedPuzzleIds.delete(puzzleId);
      return;
    }

    let firstInteraction: Date | null = null;
    let lastInteraction: Date | null = null;
    let interactionCount = 0;
    let bookmarkCounter = 0;
    let callCounter = 0;
    let chatCounter = 0;
    let documentCounter = 0;
    let guessCounter = 0;
    let correctGuessCounter = 0;

    for (const activity of activities) {
      interactionCount += 1;
      firstInteraction = minDate(firstInteraction, activity.ts);
      lastInteraction = maxDate(lastInteraction, activity.ts);

      switch (activity.type) {
        case "bookmark":
          bookmarkCounter += 1;
          break;
        case "call":
          cases;
          callCounter += 1;
          break;
        case "document":
          documentCounter += 1;
          break;
        case "chat":
          chatCounter += 1;
          break;
        case "guess":
          guessCounter += 1;
          if (activity.correct) {
            correctGuessCounter += 1;
          }
          break;
        default:
          break;
      }
    }

    const newItem: PuzzleHistoryItem = {
      _id: puzzle._id,
      userId: this.userId,
      puzzleId: puzzle._id,
      name: puzzle.title,
      url: puzzle.url ?? "#",
      huntId: puzzle.hunt,
      huntName: this.huntNames[puzzle.hunt] ?? `unknown:${puzzle.hunt}`,
      firstInteraction,
      lastInteraction,
      interactionCount,
      bookmarkCounter,
      callCounter,
      chatCounter,
      documentCounter,
      guessCounter,
      correctGuessCounter,
      solvedness: computeSolvedness(puzzle),
      answers: puzzle.answers,
      tags: puzzle.tags.map((t) => this.tagNames[t] ?? `unknown:${t}`),
    };

    if (!initializing) {
      const existing = this.puzzleHistoryMap.has(puzzleId);
      if (
        existing &&
        JSON.stringify(this.puzzleHistoryMap.get(puzzleId)) ===
          JSON.stringify(newItem)
      ) {
        // No actual change, don't publish
      } else if (existing) {
        this.changed(puzzleId, newItem);
      } else {
        this.added(puzzleId, newItem);
      }
    }
    this.puzzleHistoryMap.set(puzzleId, newItem);
  }

  private removePuzzleSummary(puzzleId: string) {
    if (this.puzzleHistoryMap.has(puzzleId)) {
      this.puzzleHistoryMap.delete(puzzleId);
      this.removed(puzzleId);
    }
  }

  private recomputeForTagChange(tagId: string, newName: string | null) {
    if (newName === null) {
      delete this.tagNames[tagId];
    } else {
      if (this.tagNames[tagId] === newName) return; // No change
      this.tagNames[tagId] = newName;
    }
    this.puzzleHistoryMap.forEach((item, puzzleId) => {
      // A bit inefficient: fetch puzzle tags again. Could optimize by storing tags in summary item.
      const puzzle = Puzzles.findOne(puzzleId, { fields: { tags: 1 } });
      if (puzzle?.tags.includes(tagId)) {
        this.recomputePuzzleSummary(puzzleId);
      }
    });
  }

  private recomputeForHuntChange(huntId: string, newName: string | null) {
    if (newName === null) {
      delete this.huntNames[huntId];
    } else {
      if (this.huntNames[huntId] === newName) return;
      this.huntNames[huntId] = newName;
    }

    this.puzzleHistoryMap.forEach((item, puzzleId) => {
      if (item.huntId === huntId) {
        this.recomputePuzzleSummary(puzzleId);
      }
    });
  }

  addSubscription(sub: Subscription) {
    this.subscriptions.add(sub);
    this.puzzleHistoryMap.forEach((item, puzzleId) => {
      sub.added("puzzleHistorySummaries", puzzleId, item);
    });
    sub.ready();

    sub.onStop(() => {
      this.subscriptions.delete(sub);
      if (this.subscriptions.size === 0) {
        this.close();
        UserPuzzleHistoryAggregator.aggregators.delete(this.userId);
      }
    });
  }

  close() {
    this.handles.forEach((handle) => handle.stop());
    this.handles = [];
    this.puzzleHistoryMap.clear();
    this.involvedPuzzleIds.clear();
  }

  private added(id: string, fields: PuzzleHistoryItem) {
    this.subscriptions.forEach((sub) =>
      sub.added("puzzleHistorySummaries", id, fields),
    );
  }

  private changed(id: string, fields: Partial<PuzzleHistoryItem>) {
    const cleanedFields = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(cleanedFields).length > 0) {
      this.subscriptions.forEach((sub) =>
        sub.changed("puzzleHistorySummaries", id, cleanedFields),
      );
    }
  }

  private removed(id: string) {
    this.subscriptions.forEach((sub) =>
      sub.removed("puzzleHistorySummaries", id),
    );
  }

  static get(userId: string): UserPuzzleHistoryAggregator {
    let aggregator = UserPuzzleHistoryAggregator.aggregators.get(userId);
    if (!aggregator) {
      aggregator = new UserPuzzleHistoryAggregator(userId);
      UserPuzzleHistoryAggregator.aggregators.set(userId, aggregator);
    }
    return aggregator;
  }
}

definePublication(PuzzleHistorySummaryForUser, {
  validate(arg: unknown) {
    check(arg, Match.ObjectIncluding({ userId: String }));
    return arg as { userId: string };
  },

  run({ userId }) {
    // Authorization: User can only view their own summary (maybe we allow
    // users or admins to browse other users' histories in future?)
    if (!this.userId || this.userId !== userId) {
      throw new Meteor.Error("unauthorized");
    }
    const aggregator = UserPuzzleHistoryAggregator.get(userId);
    aggregator.addSubscription(this);

    return undefined;
  },
});
