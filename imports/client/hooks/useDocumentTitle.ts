import { useEffect, useRef } from "react";

// Each entry tracks a title and a render order assigned on first render.
// React renders parents before children, so a higher order value means
// the component is deeper in the tree.
interface TitleEntry {
  title: string;
  order: number;
}

const entries = new Set<TitleEntry>();

// Monotonically increasing counter. React renders parent components before
// children, so a component that first renders later is deeper in the tree.
let nextOrder = 0;

function updateDocumentTitle() {
  let winner: TitleEntry | undefined;
  for (const entry of entries) {
    if (!winner || entry.order >= winner.order) {
      winner = entry;
    }
  }
  if (winner) {
    document.title = winner.title;
  }
}

// Sets the document title, supporting nested usage where the innermost
// component wins. When a component unmounts, the title reverts to the
// next outermost component's title.
function useDocumentTitle(title: string) {
  // Assign order during render. React renders parents before children,
  // so a child will always get a higher order than its parent within
  // the same render pass.
  const entryRef = useRef<TitleEntry>(null!);
  if (entryRef.current === null) {
    entryRef.current = { title, order: nextOrder++ };
  }

  // Register on mount, unregister on unmount.
  useEffect(() => {
    entries.add(entryRef.current);
    updateDocumentTitle();
    return () => {
      entries.delete(entryRef.current);
      updateDocumentTitle();
    };
  }, []);

  // Update title in place when it changes. Depth is intentionally only
  // assigned once (on first render) — reassigning on re-render would break
  // ordering if a parent re-renders while a memoized child doesn't.
  useEffect(() => {
    entryRef.current.title = title;
    updateDocumentTitle();
  }, [title]);
}

export default useDocumentTitle;
