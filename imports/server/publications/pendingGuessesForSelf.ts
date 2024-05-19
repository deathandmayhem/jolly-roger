import Guesses from "../../lib/models/Guesses";
import type { GuessType } from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { huntsUserIsOperatorFor } from "../../lib/permission_stubs";
import pendingGuessesForSelf from "../../lib/publications/pendingGuessesForSelf";
import type { SubSubscription } from "../PublicationMerger";
import PublicationMerger from "../PublicationMerger";
import type { PublishSpec } from "../publishJoinedQuery";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

const LINGER_TIME = 5000;

definePublication(pendingGuessesForSelf, {
  run() {
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

    const userWatch = MeteorUsers.find(this.userId, {
      fields: { roles: 1 },
    }).observeChanges({
      added: (_id, fields) => {
        const { roles } = fields;
        if (!roles) {
          return;
        }

        for (const huntId of huntsUserIsOperatorFor({ roles })) {
          if (!huntGuessWatchers.has(huntId)) {
            const subSubscription = merger.newSub();
            publishJoinedQuery(subSubscription, huntGuessSpec, {
              state: "pending",
              hunt: huntId,
            });
            huntGuessWatchers.set(huntId, subSubscription);
          }
        }
      },
      changed: (_id, fields) => {
        if (!("roles" in fields)) {
          // roles were unchanged
          return;
        }

        const roles = fields.roles;
        const operatorHunts = huntsUserIsOperatorFor({ roles });

        for (const huntId of operatorHunts) {
          if (!huntGuessWatchers.has(huntId)) {
            const subSubscription = merger.newSub();
            publishJoinedQuery(subSubscription, huntGuessSpec, {
              state: "pending",
              hunt: huntId,
            });
            huntGuessWatchers.set(huntId, subSubscription);
          }
        }

        for (const [huntId, subSubscription] of huntGuessWatchers.entries()) {
          if (!operatorHunts.has(huntId)) {
            merger.removeSub(subSubscription);
            huntGuessWatchers.delete(huntId);
          }
        }
      },
      // assume the user won't be removed
    });
    this.onStop(() => userWatch.stop());
    this.ready();

    return undefined;
  },
});
