import { useCallback, useEffect } from "react";
import type { RefObject } from "react";

function useFocusRefOnFindHotkey<T extends HTMLElement>(nodeRef: RefObject<T>) {
  const maybeStealCtrlF = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.includes("Mac");
      if (e.key === "f" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        const node = nodeRef.current;
        if (node) {
          node.focus();
        }
      }
    },
    [nodeRef],
  );
  useEffect(() => {
    window.addEventListener("keydown", maybeStealCtrlF);
    return () => {
      window.removeEventListener("keydown", maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);
}

export default useFocusRefOnFindHotkey;
