import { z } from "zod";
import { foreignKey, nonEmptyString } from "./customTypes";
import DiscordAccount from "./DiscordAccount";
import type { ModelType } from "./Model";
import Model from "./Model";
import withCommon from "./withCommon";

// Audit trail for user merge operations. Each record tracks a merge of
// participants[0] (source, going away) into participants[1] (target,
// surviving). The snapshot captures the source user's unique fields before
// they are cleared, so the job can resume idempotently if interrupted.
const MergeOperation = withCommon(
  z.object({
    // [sourceUser, targetUser]
    participants: z.tuple([foreignKey, foreignKey]),
    // The background job that owns this merge.
    job: foreignKey,
    // Set when the merge is fully complete (source deleted, FKs updated).
    completedAt: z.date().optional(),
    // Source user's unique fields, captured before clearing them so they
    // can be transferred to the target even if the job restarts.
    snapshot: z
      .object({
        emails: z
          .object({ address: nonEmptyString, verified: z.boolean() })
          .array(),
        googleAccount: nonEmptyString.optional(),
        googleAccountId: nonEmptyString.optional(),
        googleProfilePicture: nonEmptyString.optional(),
        discordAccount: DiscordAccount.optional(),
      })
      .optional(),
  }),
);

const MergeOperations = new Model("jr_merge_operations", MergeOperation);
// Because participants is an array, MongoDB creates a multikey index with
// separate entries for each element. The unique constraint therefore prevents
// any two in-flight merges from sharing a participant in *any* position,
// not just the same [source, target] pair. This is the primary concurrency
// control for merges. Completed merges (completedAt set) fall out of the
// partial filter and don't conflict, so they serve purely as an audit trail.
MergeOperations.addIndex(
  { participants: 1 },
  { unique: true, partialFilterExpression: { completedAt: null } },
);
export type MergeOperationType = ModelType<typeof MergeOperations>;

export default MergeOperations;
