import { useLayoutEffect, useRef } from "react";

// Track title entries by object identity. Set maintains insertion order,
// so the last entry is always the innermost (most recently mounted) component.
const entries = new Set<{ title: string }>();

function updateDocumentTitle() {
  const arr = [...entries];
  if (arr.length > 0) {
    document.title = arr[arr.length - 1]!.title;
  }
}

// Sets the document title, supporting nested usage where the innermost
// component wins. When a component unmounts, the title reverts to the
// next outermost component's title.
function useDocumentTitle(title: string) {
  // Stable ref holding a mutable entry object. Using an object allows us to
  // update the title in place without changing our position in the Set.
  const entryRef = useRef<{ title: string }>(null!);
  if (entryRef.current === null) {
    entryRef.current = { title };
  }

  // Register on mount, unregister on unmount (empty deps).
  // useLayoutEffect ensures parent registers before child, maintaining
  // the correct hierarchy order in the Set.
  useLayoutEffect(() => {
    entries.add(entryRef.current);
    updateDocumentTitle();
    return () => {
      entries.delete(entryRef.current);
      updateDocumentTitle();
    };
  }, []);

  // Update our entry's title when it changes, then re-evaluate which title wins.
  // This correctly handles parent title changes while a child is mounted:
  // the parent's entry is updated, but updateDocumentTitle() still picks the
  // child's entry (last in Set) as the winner.
  useLayoutEffect(() => {
    entryRef.current.title = title;
    updateDocumentTitle();
  }, [title]);
}

export default useDocumentTitle;
