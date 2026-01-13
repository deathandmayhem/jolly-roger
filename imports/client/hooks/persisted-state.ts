import type { SetStateAction } from "react";
import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";


export const useNotesPageViewMode = () => {
  return useLocalStorage<"list" | "table" | "fullwidth">(
    "notesPageViewMode",
    "list",
  );
};

export const useNotesPageShowSolved = () => {
  return useLocalStorage<boolean>("notesPageShowSolved", false);
};

export type AppThemeState = "dark" | "light" | "auto";
export const useAppThemeState = () => {
  return useLocalStorage<AppThemeState>("appTheme", "dark");
};

export const usePersistedSidebarWidth = () => {
  return useLocalStorage<number>("persistentSidebarWidth", 250);
};

export type OperatorActionsHiddenState = Record<string /* huntId */, boolean>;

export const useOperatorActionsHidden = () => {
  return useLocalStorage<OperatorActionsHiddenState>(
    "operatorActionsHidden",
    {},
  );
};

export const useOperatorActionsHiddenForHunt = (huntId: string) => {
  const [operatorActionsHidden, setOperatorActionsHidden] =
    useOperatorActionsHidden();
  return [
    operatorActionsHidden?.[huntId] ?? false,
    useCallback(
      (update: SetStateAction<boolean>) => {
        setOperatorActionsHidden((prevHidden) => {
          const newHidden = {
            ...prevHidden,
            [huntId]:
              typeof update === "function"
                ? update(prevHidden?.[huntId] ?? false)
                : update,
          };
          return newHidden;
        });
      },
      [setOperatorActionsHidden, huntId],
    ),
  ] as const;
};

export type PuzzleListState = {
  displayMode: "group" | "unlock";
  showSolved: boolean;
  showSolvers: "hide" | "viewers" | "active";
  collapseGroups: Record<string /* tag ID */, boolean>;
};

const defaultPuzzleListState = () => {
  return {
    displayMode: "group",
    showSolved: false,
    showSolvers: "viewers",
    collapseGroups: {},
  } as PuzzleListState;
};

export const useHuntPuzzleListState = (huntId: string) => {
  const [puzzleListView, setPuzzleListView] = useLocalStorage<
    Record<string /* huntId */, PuzzleListState>
  >("puzzleListView", {});
  return [
    puzzleListView?.[huntId] ?? defaultPuzzleListState(),
    useCallback(
      (update: SetStateAction<PuzzleListState>) => {
        setPuzzleListView((prevView) => {
          const newView = {
            ...prevView,
            [huntId]:
              typeof update === "function"
                ? update(prevView?.[huntId] ?? defaultPuzzleListState())
                : update,
          };
          return newView;
        });
      },
      [setPuzzleListView, huntId],
    ),
  ] as const;
};

export const useHuntPuzzleListDisplayMode = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] =
    useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.displayMode,
    useCallback(
      (update: SetStateAction<"group" | "unlock">) => {
        setHuntPuzzleListView((prevView) => {
          const newView = {
            ...prevView,
            displayMode:
              typeof update === "function"
                ? update(prevView.displayMode)
                : update,
          };
          return newView;
        });
      },
      [setHuntPuzzleListView],
    ),
  ] as const;
};

export const useHuntPuzzleListShowSolved = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] =
    useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.showSolved,
    useCallback(
      (update: SetStateAction<boolean>) => {
        setHuntPuzzleListView((prevView) => {
          const newView = {
            ...prevView,
            showSolved:
              typeof update === "function"
                ? update(prevView.showSolved)
                : update,
          };
          return newView;
        });
      },
      [setHuntPuzzleListView],
    ),
  ] as const;
};

export const useHuntPuzzleListShowSolvers = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] =
    useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.showSolvers,
    useCallback(
      (update: SetStateAction<"hide" | "viewing">) => {
        setHuntPuzzleListView((prevView) => {
          const newView = {
            ...prevView,
            showSolvers:
              typeof update === "function"
                ? update(prevView.showSolvers)
                : update,
          };
          return newView;
        });
      },
      [setHuntPuzzleListView],
    ),
  ] as const;
};

export const useHuntPuzzleListCollapseGroups = (huntId: string) => {
  const [huntPuzzleListView, setHuntPuzzleListView] =
    useHuntPuzzleListState(huntId);
  return [
    huntPuzzleListView.collapseGroups,
    useCallback(
      (update: SetStateAction<Record<string /* tag ID */, boolean>>) => {
        setHuntPuzzleListView((prevView) => {
          const newView = {
            ...prevView,
            collapseGroups:
              typeof update === "function"
                ? update(prevView.collapseGroups)
                : update,
          };
          return newView;
        });
      },
      [setHuntPuzzleListView],
    ),
  ] as const;
};

export const useHuntPuzzleListCollapseGroup = (
  huntId: string,
  tagId: string,
) => {
  const [huntPuzzleListCollapseGroups, setHuntPuzzleListCollapseGroups] =
    useHuntPuzzleListCollapseGroups(huntId);
  return [
    huntPuzzleListCollapseGroups[tagId] ?? false,
    useCallback(
      (update: SetStateAction<boolean>) => {
        setHuntPuzzleListCollapseGroups((prevView) => {
          const newView = {
            ...prevView,
            [tagId]:
              typeof update === "function"
                ? update(prevView[tagId] ?? false)
                : update,
          };
          return newView;
        });
      },
      [setHuntPuzzleListCollapseGroups, tagId],
    ),
  ] as const;
};
