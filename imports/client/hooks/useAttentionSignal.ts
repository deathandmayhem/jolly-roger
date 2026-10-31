import { Random } from "meteor/random";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { AttentionStateSignalType } from "../../lib/engagement/attentionSignals";
import reportAttentionTransition from "../../methods/reportAttentionTransition";
import tabId from "../tabId";

const REPORT_DEBOUNCE_MS = 1000;

const report = (signal: AttentionStateSignalType, value: boolean) => {
  reportAttentionTransition.call({
    tab: tabId,
    signal,
    value,
    dedupKey: Random.id(),
  });
};

const useAttentionSignal = (
  signal: AttentionStateSignalType,
  value: boolean,
  readyFor: string | undefined,
): void => {
  const reported = useRef<{ user: string; value: boolean } | undefined>(
    undefined,
  );

  // Once ready (the tab's context report has gone out on this connection, for
  // this user), report the value right away, then report changes only once
  // they've held for REPORT_DEBOUNCE_MS
  useEffect(() => {
    if (!readyFor) {
      // Nothing we've reported carries over to the next connection (or login)
      reported.current = undefined;
      return undefined;
    }
    const last =
      reported.current?.user === readyFor ? reported.current.value : undefined;
    if (last === value) {
      return undefined;
    }

    const send = () => {
      reported.current = { user: readyFor, value };
      report(signal, value);
    };
    if (last === undefined) {
      send();
      return undefined;
    }
    const timeout = setTimeout(send, REPORT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [signal, value, readyFor]);

  // Clear the signal on unmount, ahead of any navigation's context report
  useLayoutEffect(
    () => () => {
      if (reported.current?.value) {
        report(signal, false);
        // StrictMode remounts with this ref intact
        reported.current = undefined;
      }
    },
    [signal],
  );
};

export default useAttentionSignal;
