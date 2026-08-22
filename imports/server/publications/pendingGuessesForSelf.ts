import type { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import type { GuessType } from "../../lib/models/Guesses";
import Guesses from "../../lib/models/Guesses";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { huntsUserMayOperateGuessQueueFor } from "../../lib/permission_stubs";
import pendingGuessesForSelf from "../../lib/publications/pendingGuessesForSelf";
import type { SubSubscription } from "../PublicationMerger";
import PublicationMerger from "../PublicationMerger";
import type { PublishSpec } from "../publishJoinedQuery";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

const LINGER_TIME = 5000;

// This is quite the complicated publication; probably one of the most complex.
// The dataflow is:
// load invoker's User ->
// load all Hunts they are a member of ->
// filter hunts to those for which they may operate the guess queue, which depends on both User and Hunt data ->
// publish all pending Guesses for those hunts ->
//   publish all foreign-keyed objects (hunt, puzzle, createdBy user)
//   publish Guess
//
// And update the publish set any time the user's hunt membership, roles, or the Hunt's required permissions change.

definePublication(pendingGuessesForSelf, {
  async run() {
    if (!this.userId) {
      return [];
    }

    const huntGuessWatchers: Map<string, SubSubscription> = new Map();

    const merger = new PublicationMerger(this);

    const huntGuessSpec: PublishSpec<GuessType> = {
      model: Guesses,
      foreignKeys: [
        {
          field: "hunt",
          join: { model: Hunts },
        },
        {
          field: "puzzle",
          join: { model: Puzzles },
        },
        {
          field: "createdBy",
          join: {
            model: MeteorUsers,
            projection: { displayName: 1 },
          },
        },
      ],
      // top-level Guess object and its referents should linger so we can
      // display it in the guess queue briefly after processing for continuity
      lingerTime: LINGER_TIME,
    };

    const refreshObservers = (guessQueueHunts: Set<string>) => {
      // Add watchers for any new hunts
      for (const huntId of guessQueueHunts) {
        if (!huntGuessWatchers.has(huntId)) {
          const subSubscription = merger.newSub();
          huntGuessWatchers.set(huntId, subSubscription);
          publishJoinedQuery(subSubscription, huntGuessSpec, {
            state: "pending",
            hunt: huntId,
          }).catch((error) => {
            Logger.error(
              "pendingGuessesForSelf: publishJoinedQuery(hunt) failed",
              { error, hunt: huntId },
            );
            this.error(error);
          });
        }
      }

      // And remove watchers for any hunts no longer included in guessQueueHunts
      for (const [huntId, subSubscription] of huntGuessWatchers.entries()) {
        if (!guessQueueHunts.has(huntId)) {
          merger.removeSub(subSubscription);
          huntGuessWatchers.delete(huntId);
        }
      }
    };

    // The last known state of the user's hunts/roles fields
    const userResidue: Pick<Meteor.User, "hunts" | "roles"> = {
      hunts: [],
      roles: {},
    };

    // A cache of the last-known contents of all Hunts that the user is a member of.
    let huntsCache: Map<string, HuntType> = new Map();
    let huntsWatch: Meteor.LiveQueryHandle | undefined = undefined;

    // Recomputes the set of hunts for which this user may operate the guess queue,
    // based on our last-known in-memory cache.
    const permissionedHunts: () => Set<string> = () => {
      return huntsUserMayOperateGuessQueueFor(userResidue, [
        ...huntsCache.values(),
      ]);
    };

    // Refresh our observer of the hunts collection
    const refreshHuntsWatcher = async () => {
      const newHuntsCache: Map<string, HuntType> = new Map();
      const newWatcher = await Hunts.find(
        {
          _id: { $in: userResidue.hunts },
        },
        { projection: { customPermissions: 1 } },
      ).observeChangesAsync({
        added: (_id, fields) => {
          newHuntsCache.set(_id, { ...fields, _id } as unknown as HuntType);
        },
        changed: (_id, fields) => {
          // Merge in changes
          const oldObj = newHuntsCache.get(_id);
          const newObj = {
            ...oldObj,
            ...fields,
          } as unknown as HuntType;
          newHuntsCache.set(_id, newObj);
          if ("customPermissions" in fields) {
            // trigger refresh
            refreshObservers(permissionedHunts());
          }
        },
        removed: (_id) => {
          newHuntsCache.delete(_id);
        },
      });

      // Now that all the added()s have been called, swap in the new hunts cache map.
      huntsCache = newHuntsCache;
      // Replace the old huntsWatch watcher object.
      if (huntsWatch) {
        huntsWatch.stop();
      }
      huntsWatch = newWatcher;

      // do initial refresh now that newHuntsCache is populated
      refreshObservers(permissionedHunts());
    };

    const userWatch = await MeteorUsers.find(this.userId, {
      projection: { hunts: 1, roles: 1 },
    }).observeChangesAsync({
      added: (_id, fields) => {
        const { hunts, roles } = fields;
        userResidue.hunts = hunts;
        userResidue.roles = roles;
      },
      changed: (_id, fields) => {
        if ("hunts" in fields) {
          userResidue.hunts = fields.hunts;
        }
        if ("roles" in fields) {
          userResidue.roles = fields.roles;
        }
        if (!("hunts" in fields) && !("roles" in fields)) {
          // no relevant fields changed
          return;
        }
        void refreshHuntsWatcher().catch((error) => {
          Logger.error("refreshHuntsWatcher failed", {
            user: this.userId,
            error,
          });
        });
      },
      // assume the user won't be removed
    });

    await refreshHuntsWatcher();

    this.onStop(() => {
      huntsWatch?.stop();
      userWatch.stop();
    });
    this.ready();

    return undefined;
  },
});
