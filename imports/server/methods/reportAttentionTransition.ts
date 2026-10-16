import { check, Match } from "meteor/check";
import { AttentionStateSignal } from "../../lib/engagement/attentionSignals";
import { Id } from "../../lib/typedModel/regexes";
import reportAttentionTransition from "../../methods/reportAttentionTransition";
import {
  acceptingReports,
  appendSignal,
  connectionContext,
} from "../attentionLog";
import defineMethod from "./defineMethod";

defineMethod(reportAttentionTransition, {
  validate(arg) {
    check(arg, {
      tab: Match.Where(
        (t: unknown): t is string => typeof t === "string" && Id.test(t),
      ),
      signal: Match.OneOf(...AttentionStateSignal.options),
      value: Boolean,
      dedupKey: Match.Where(
        (k: unknown): k is string =>
          typeof k === "string" && k.length > 0 && k.length <= 128,
      ),
    });
    return arg;
  },

  async run({ tab, signal, value, dedupKey }) {
    if (!this.userId || !this.connection) {
      return;
    }
    if (!acceptingReports(this.connection)) {
      return;
    }
    await appendSignal(
      { user: this.userId, connection: this.connection.id, tab },
      connectionContext(this.connection),
      signal,
      value,
      dedupKey,
      new Date(),
    );
  },
});
