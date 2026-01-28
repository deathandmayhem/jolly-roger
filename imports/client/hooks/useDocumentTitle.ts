import { useEffect, useRef } from "react";

import useImmediateEffect from "./useImmediateEffect";

// Global state, but hey, document.title *is* a global
const titles: string[] = [];

function updateDocumentTitle() {
  if (titles.length > 0) {
    document.title = titles.at(-1)!;
  }
}

function addTitle(title: string) {
  titles.push(title);
  updateDocumentTitle();
}

function replaceTitle(prevTitle: string, title: string) {
  // This assumes no one will place duplicate titles in the hierarchy, but
  // that's probably fine
  const idx = titles.lastIndexOf(prevTitle);
  if (idx !== -1) {
    titles[idx] = title;
    updateDocumentTitle();
  }
}

function removeTitle(title: string) {
  const idx = titles.lastIndexOf(title);
  if (idx !== -1) {
    titles.splice(idx, 1);
    updateDocumentTitle();
  }
}

function useDocumentTitle(title: string) {
  const lastTitle = useRef<string | undefined>(undefined);

  // we use useImmediateEffect here to ensure we're adding these to the array
  // in component hierarchy order rather than effect schedule order.
  useImmediateEffect(() => {
    if (lastTitle.current === undefined) {
      addTitle(title);
    } else {
      replaceTitle(lastTitle.current, title);
    }

    lastTitle.current = title;
  }, [title]);

  // We use separate effect calls for add/update and remove, since we only want
  // to remove on the final teardown
  useEffect(() => {
    return () => {
      if (lastTitle.current !== undefined) {
        removeTitle(lastTitle.current);
      }
    };
  }, []);
}

export default useDocumentTitle;
