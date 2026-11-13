import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { useTracker } from "meteor/react-meteor-data";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { useMatch } from "react-router";
import Flags from "../../Flags";
import { Id } from "../../lib/typedModel/regexes";
import reportAttentionContext from "../../methods/reportAttentionContext";
import useAttentionSignal from "../hooks/useAttentionSignal";
import tabId from "../tabId";

const AttentionReadyContext = createContext<string | undefined>(undefined);

export const useAttentionReady = () => useContext(AttentionReadyContext);

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const getTabVisible = () => document.visibilityState === "visible";

export const subscribeWindowFocus = (onChange: () => void) => {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  // The top-level window gets no event when the browser goes to the background
  // while focus is inside a cross-origin iframe
  const interval = setInterval(onChange, 1000);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
    clearInterval(interval);
  };
};
const getWindowFocused = () => document.hasFocus();

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

  // Dependency key for when we (a) can report signals (if it's set) and (b)
  // need to re-report all of them, including context (if it changes, switching
  // users included)
  const readyFor =
    connected && userId && !reportingDisabled ? userId : undefined;

  // Report the current hunt/puzzle once ready and on navigation. This must fire
  // after unmounted components have cleared their signals and before any new
  // signals are reported. Layout effect setup runs after all layout effect
  // cleanups (unmounts) have run and before passive effect setups (where
  // signals are reported) begin.
  //
  // Since this is the only layout effect in the attention system that does
  // anything on setup, we don't need to worry about ordering between other
  // layout effects.
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

  const tabVisible = useSyncExternalStore(subscribeVisibility, getTabVisible);
  const windowFocused = useSyncExternalStore(
    subscribeWindowFocus,
    getWindowFocused,
  );
  useAttentionSignal("tabVisible", tabVisible, readyFor);
  useAttentionSignal("windowFocused", windowFocused, readyFor);

  return (
    <AttentionReadyContext value={readyFor}>{children}</AttentionReadyContext>
  );
};

export default AttentionReporter;
