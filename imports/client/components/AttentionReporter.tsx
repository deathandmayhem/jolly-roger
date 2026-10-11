import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { useTracker } from "meteor/react-meteor-data";
import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useMatch } from "react-router";
import Flags from "../../Flags";
import { Id } from "../../lib/typedModel/regexes";
import reportAttentionContext from "../../methods/reportAttentionContext";
import tabId from "../tabId";

const AttentionReporter = ({ children }: { children: ReactNode }) => {
  const userId = useTracker(() => Meteor.userId(), []);
  const connected = useTracker(() => Meteor.status().connected, []);
  const reportingDisabled = useTracker(
    () => Flags.active("disable.attention_reporting"),
    [],
  );

  const huntMatch = useMatch("/hunts/:huntId/*");
  const routeHuntId = huntMatch?.params.huntId;
  // Reject invalid hunt/puzzle IDs (e.g. /hunts/new)
  const huntId = routeHuntId && Id.test(routeHuntId) ? routeHuntId : undefined;

  const puzzleMatch = useMatch("/hunts/:huntId/puzzles/:puzzleId");
  const routePuzzleId = puzzleMatch?.params.puzzleId;
  const puzzleId =
    routePuzzleId && Id.test(routePuzzleId) ? routePuzzleId : undefined;

  // The user we're reporting for, if we can report at all. If connection,
  // account, or circuit breaker state changes, then we may need to re-report
  // context
  const readyFor =
    connected && userId && !reportingDisabled ? userId : undefined;

  // Report the current hunt/puzzle once ready and on every navigation. This
  // needs to be a layout effect so that it runs before descendent components
  // (i.e. DocumentDisplay) report individual signals, since the reducer drops
  // signals for a tab whose context hasn't been reported yet.
  useLayoutEffect(() => {
    if (!readyFor) {
      return;
    }
    reportAttentionContext.call({
      tab: tabId,
      huntId,
      puzzleId,
      dedupKey: Random.id(),
    });
  }, [readyFor, huntId, puzzleId]);

  return children;
};

export default AttentionReporter;
