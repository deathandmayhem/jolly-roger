import { Reload } from 'meteor/reload';
import { SetStateAction, useCallback } from 'react';
import createPersistedState from 'use-persisted-state';

export type OperatorActionsHiddenState = Record<string /* huntId */, boolean>;
export const useOperatorActionsHidden =
  createPersistedState<OperatorActionsHiddenState>('operatorActionsHidden');

export const useOperatorActionsHiddenForHunt = (huntId: string) => {
  const [operatorActionsHidden, setOperatorActionsHidden] = useOperatorActionsHidden();
  return [
    operatorActionsHidden?.[huntId] ?? false,
    useCallback((update: SetStateAction<boolean>) => {
      setOperatorActionsHidden((prevHidden) => {
        const newHidden = {
          ...prevHidden,
          [huntId]: typeof update === 'function' ? update(prevHidden?.[huntId] ?? false) : update,
        };
        return newHidden;
      });
    }, [setOperatorActionsHidden, huntId]),
  ] as const;
};

export type PuzzleListState = {
  displayMode: 'group' | 'unlock';
  showSolved: boolean;
  collapseGroups: Record<string /* tag ID */, boolean>;
}
export const usePuzzleListState = createPersistedState<Record<string /* huntId */, PuzzleListState>>('puzzleListView');

const defaultPuzzleListState = () => {
  return { displayMode: 'group', showSolved: true, collapseGroups: {} } as PuzzleListState;
};
export const useHuntPuzzleListState = (huntId: string) => {
  const [puzzleListView, setPuzzleListView] = usePuzzleListState();
  return [
    puzzleListView?.[huntId] ?? defaultPuzzleListState(),
    useCallback((update: SetStateAction<PuzzleListState>) => {
      setPuzzleListView((prevView) => {
        const newView = {
          ...prevView,
          [huntId]: typeof update === 'function' ? update(prevView?.[huntId] ?? defaultPuzzleListState()) : update,
        };
        return newView;
      });
    }, [setPuzzleListView, huntId]),
  ] as const;
};

export const useHuntPuzzleListDisplayMode = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] = useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.displayMode,
    useCallback((update: SetStateAction<'group' | 'unlock'>) => {
      setHuntPuzzleListView((prevView) => {
        const newView = {
          ...prevView,
          displayMode: typeof update === 'function' ? update(prevView.displayMode) : update,
        };
        return newView;
      });
    }, [setHuntPuzzleListView]),
  ] as const;
};

export const useHuntPuzzleListShowSolved = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] = useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.showSolved,
    useCallback((update: SetStateAction<boolean>) => {
      setHuntPuzzleListView((prevView) => {
        const newView = {
          ...prevView,
          showSolved: typeof update === 'function' ? update(prevView.showSolved) : update,
        };
        return newView;
      });
    }, [setHuntPuzzleListView]),
  ] as const;
};

export const useHuntPuzzleListCollapseGroups = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] = useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.collapseGroups,
    useCallback((update: SetStateAction<Record<string /* tag ID */, boolean>>) => {
      setHuntPuzzleListView((prevView) => {
        const newView = {
          ...prevView,
          collapseGroups: typeof update === 'function' ? update(prevView.collapseGroups) : update,
        };
        return newView;
      });
    }, [setHuntPuzzleListView]),
  ] as const;
};

export const useHuntPuzzleListCollapseGroup = (huntId: string, tagId: string) => {
  const [huntPuzzleListCollapseGroups, setHuntPuzzleListCollapseGroups] =
    useHuntPuzzleListCollapseGroups(huntId);
  return [
    huntPuzzleListCollapseGroups[tagId] ?? false,
    useCallback((update: SetStateAction<boolean>) => {
      setHuntPuzzleListCollapseGroups((prevView) => {
        const newView = {
          ...prevView,
          [tagId]: typeof update === 'function' ? update(prevView[tagId] ?? false) : update,
        };
        return newView;
      });
    }, [setHuntPuzzleListCollapseGroups, tagId]),
  ] as const;
};

// Allow tab ID to be persistent cor the duration of a single window/tab's session
export const useTabId = createPersistedState<string>('tabId', sessionStorage);

// Tie together Meteor's reload hooks and direct use of sessionStorage to create
// a state storage that persists across Meteor-triggered reloads, but not other
// reloads. This ensures that (e.g.) call state is persisted when Meteor code
// pushes happen, but not when the user manually reloads the page.
//
// To ensure that data doesn't stick around, we cache writes in memory until we
// get a reload trigger from Meteor, at which point we flush to sessionStorage.
// We read and delete that sessionStorage at startup, so it's not still around
// for subsequent reloads.
const sessionStorageKey = 'reloadOnlyPersistedState';
const meteorReloadOnlyCache = new Map<string, string>(
  Object.entries(
    JSON.parse(
      sessionStorage.getItem(sessionStorageKey) ?? '[]'
    )
  )
);
sessionStorage.removeItem(sessionStorageKey);
Reload._onMigrate(() => {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(
    Object.fromEntries(
      meteorReloadOnlyCache.entries()
    )
  ));
  return [true];
});
const meteorReloadOnlySessionStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem(key) {
    return meteorReloadOnlyCache.get(key) ?? null;
  },

  setItem(key, value) {
    meteorReloadOnlyCache.set(key, value);
  },
};

export const useSavedCallState = createPersistedState<'idle' | 'active' | 'muted' | 'deafened'>(
  'savedCallState',
  meteorReloadOnlySessionStorage,
);
