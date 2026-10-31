import { check, Match } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { Id } from "../../lib/typedModel/regexes";
import reportAttentionContext from "../../methods/reportAttentionContext";
import {
  acceptingReports,
  appendContext,
  markConnection,
} from "../attentionLog";
import defineMethod from "./defineMethod";

defineMethod(reportAttentionContext, {
  validate(arg) {
    check(arg, {
      tab: Match.Where(
        (t: unknown): t is string => typeof t === "string" && Id.test(t),
      ),
      huntId: Match.Optional(String),
      puzzleId: Match.Optional(String),
      dedupKey: Match.Where(
        (k: unknown): k is string =>
          typeof k === "string" && k.length > 0 && k.length <= 128,
      ),
    });
    return arg;
  },

  async run({ tab, huntId, puzzleId, dedupKey }) {
    if (!this.userId || !this.connection) {
      return;
    }

    // Ignore hunts the user doesn't actually belong to, and puzzle IDs that
    // aren't well-formed (but still otherwise accept the report)
    const user = await MeteorUsers.findOneAsync(this.userId);
    const hunt = huntId && user?.hunts?.includes(huntId) ? huntId : undefined;
    const puzzle = hunt && puzzleId && Id.test(puzzleId) ? puzzleId : undefined;

    // Don't await anything between this check and marking the connection (if the
    // circuit breaker turns on or the connection closes in between, this tab
    // would be left open)
    if (!acceptingReports(this.connection)) {
      return;
    }
    const written = appendContext(
      { user: this.userId, connection: this.connection.id, tab },
      { hunt, puzzle },
      dedupKey,
      new Date(),
    );
    markConnection(this.connection, { user: this.userId, tab, written });

    // Return only once the write finishes - Meteor (without this.unblock())
    // runs methods in order, and we want individual signals to be processed
    // after context is established.
    await written;
  },
});
