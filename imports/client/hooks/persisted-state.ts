import type { SetStateAction } from "react";
import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";

export type AppThemeState = "dark" | "light" | "auto";
export const useAppThemeState = () => {
  return useLocalStorage<AppThemeState>("appTheme", "auto");
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
  collapseGroups: Record<string /* tag ID */, boolean>;
};

const defaultPuzzleListState = () => {
  return {
    displayMode: "group",
    showSolved: true,
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

export const useAddPuzzleLastSelectedHuntId = () => {
  return useLocalStorage<string | undefined>(
    "addPuzzleLastSelectedHuntId",
    undefined,
  );
};

const ADD_PUZZLE_RECENT_TAGS_LIMIT = 10;

export const useAddPuzzleHuntRecentTags = (huntId?: string) => {
  const [allRecentTags, setAllRecentTags] = useLocalStorage<
    Record<string /* huntId */, string[]>
  >("huntRecentTags", {});

  const recentTags = (huntId ? allRecentTags?.[huntId] : undefined) ?? [];

  const addPuzzleHuntRecentTags = useCallback(
    (newTags: string[]) => {
      if (!huntId || newTags.length === 0) return;
      setAllRecentTags((prev) => {
        const prevHuntTags = prev?.[huntId] ?? [];
        // Newly added tags at the beginning, followed by previous tags excluding new ones, truncated to limit
        const combined = [
          ...newTags,
          ...prevHuntTags.filter((t) => !newTags.includes(t)),
        ].slice(0, ADD_PUZZLE_RECENT_TAGS_LIMIT);
        return {
          ...prev,
          [huntId]: combined,
        };
      });
    },
    [setAllRecentTags, huntId],
  );

  return [recentTags, addPuzzleHuntRecentTags] as const;
};
