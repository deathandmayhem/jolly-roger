import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faCircle } from "@fortawesome/free-regular-svg-icons/faCircle";
import { faClock } from "@fortawesome/free-regular-svg-icons/faClock";
import { faEye } from "@fortawesome/free-regular-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/free-regular-svg-icons/faEyeSlash";
import { faFolderOpen } from "@fortawesome/free-regular-svg-icons/faFolderOpen";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faGlobe } from "@fortawesome/free-solid-svg-icons/faGlobe";
import { faMapPin } from "@fortawesome/free-solid-svg-icons/faMapPin";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import InputGroup from "react-bootstrap/InputGroup";
import Overlay from "react-bootstrap/Overlay";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import Tooltip from "react-bootstrap/Tooltip";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled, { css } from "styled-components";
import isAdmin from "../../lib/isAdmin";
import { sortedBy } from "../../lib/listUtils";
import Bookmarks from "../../lib/models/Bookmarks";
import Hunts from "../../lib/models/Hunts";
import Peers from "../../lib/models/mediasoup/Peers";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import UserStatuses from "../../lib/models/UserStatuses";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import presenceForHunt from "../../lib/publications/presenceForHunt";
import puzzleActivityForHunt from "../../lib/publications/puzzleActivityForHunt";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import statusesForHuntUsers from "../../lib/publications/statusesForHuntUsers";
import {
  filteredPuzzleGroups,
  puzzleGroupsByRelevance,
} from "../../lib/puzzle-sort-and-group";
import { computeSolvedness } from "../../lib/solvedness";
import createPuzzle from "../../methods/createPuzzle";
import { useBreadcrumb } from "../hooks/breadcrumb";
import {
  useHuntPuzzleListCollapseGroups,
  useHuntPuzzleListDisplayMode,
  useHuntPuzzleListShowSolved,
  useHuntPuzzleListShowSolvers,
  useOperatorActionsHiddenForHunt,
} from "../hooks/persisted-state";
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import useSubscribeAvatars from "../hooks/useSubscribeAvatars";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import { Subscribers } from "../subscribers";
import HuntNav from "./HuntNav";
import { userStatusesToLastSeen } from "./HuntProfileListPage";
import PuzzleList from "./PuzzleList";
import type {
  PuzzleModalFormHandle,
  PuzzleModalFormSubmitPayload,
} from "./PuzzleModalForm";
import PuzzleModalForm from "./PuzzleModalForm";
import RelatedPuzzleGroup, { PuzzleGroupDiv } from "./RelatedPuzzleGroup";
import RelatedPuzzleList from "./RelatedPuzzleList";
import { mediaBreakpointDown } from "./styling/responsive";

const ViewControls = styled.div<{ $canAdd?: boolean }>`
  display: grid;
  grid-template-columns: auto auto auto auto 1fr;
  align-items: end;
  gap: 1em;
  margin-bottom: 1em;
  ${(props) =>
    props.$canAdd &&
    mediaBreakpointDown(
      "xs",
      css`
        grid-template-columns: 1fr 1fr;
      `,
    )}

  @media (width < 360px) {
    /* For very narrow viewports (like iPad Split View) */
    grid-template-columns: 100%;
  }

  .btn {
    /* Inputs and Button Toolbars are not quite the same height */
    padding-top: 7px;
    padding-bottom: 7px;
  }
`;

const SearchFormGroup = styled(FormGroup)<{ $canAdd?: boolean }>`
  grid-column: ${(props) => (props.$canAdd ? 1 : 4)} / -1;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-column: 1 / -1;
    `,
  )}
`;

const SearchFormLabel = styled(FormLabel)<{ $canAdd?: boolean }>`
  display: ${(props) => (props.$canAdd ? "none" : "inline-block")};
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;

const OperatorActionsFormGroup = styled(FormGroup)`
  ${mediaBreakpointDown(
    "xs",
    css`
      order: -1;
    `,
  )}
`;

const AddPuzzleFormGroup = styled(FormGroup)`
  justify-self: end;
  ${mediaBreakpointDown(
    "xs",
    css`
      justify-self: auto;
      order: -1;
    `,
  )}

  @media (width < 360px) {
    order: -2;
  }
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  @media (width < 360px) {
    width: 100%;
  }
`;

const StyledButton: FC<ComponentPropsWithRef<typeof Button>> = styled(Button)`
  @media (width < 360px) {
    width: 100%;
  }
`;

const PuzzleListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5em;
`;

const HuntNavWrapper = styled.div`
  display: none;
  ${mediaBreakpointDown(
    "sm",
    css`
      display: flex;
      width: 100%;
      margin-bottom: 8px;
    `,
  )}
`;

const ONE_PUZZLE_TOOLTIP_ARROW_MAX = 120;

const StyledTooltip = styled(Tooltip)<{ $cursorOffset: number }>`
  & .tooltip-arrow {
    position: absolute !important;
    transform: none !important;
    left: ${(props) => props.$cursorOffset}px !important;
    max-width: calc(100% - 10px);
  }
`;

const getTextWidth = (text: string, font: string) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = font;
    return context.measureText(text).width;
  }
  return 0;
};

const PuzzleListView = ({
  huntId,
  canAdd,
  canUpdate,
  loading,
}: {
  huntId: string;
  canAdd: boolean;
  canUpdate: boolean;
  loading: boolean;
}) => {
  const allPuzzles = useTracker(
    () => Puzzles.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const bookmarked = useTracker(() => {
    const bookmarks = Bookmarks.find({ hunt: huntId, user: Meteor.userId()! })
      .fetch()
      .map((b) => b.puzzle);
    return new Set(bookmarks);
  }, [huntId]);

  const deletedPuzzles = useTracker(
    () =>
      !isAdmin || loading
        ? undefined
        : Puzzles.findDeleted({ hunt: huntId }).fetch(),
    [huntId, loading],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get("q") ?? "";
  const addModalRef = useRef<PuzzleModalFormHandle>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const handleSearchFocus = useCallback(() => setIsSearchFocused(true), []);
  const handleSearchBlur = useCallback(() => setIsSearchFocused(false), []);
  const [displayMode, setDisplayMode] = useHuntPuzzleListDisplayMode(huntId);
  const [showSolved, setShowSolved] = useHuntPuzzleListShowSolved(huntId);
  const [showSolvers, setShowSolvers] = useHuntPuzzleListShowSolvers(huntId);
  const [huntPuzzleListCollapseGroups, setHuntPuzzleListCollapseGroups] =
    useHuntPuzzleListCollapseGroups(huntId);
  const [cursorOffset, setCursorOffset] = useState<number>(10);

  const expandAllGroups = useCallback(() => {
    setHuntPuzzleListCollapseGroups({});
  }, [setHuntPuzzleListCollapseGroups]);
  const canExpandAllGroups =
    displayMode === "group" &&
    Object.values(huntPuzzleListCollapseGroups).some((collapsed) => collapsed);

  const updateCursorPosition = useCallback(() => {
    const input = searchBarRef.current;
    if (!input) return;

    const selectionStart = input.selectionStart || 0;
    const text = input.value.substring(0, selectionStart);

    // Get the computed font style to ensure accurate measurement
    const computedStyle = window.getComputedStyle(input);
    const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;

    // Measure text and add padding
    const textWidth = getTextWidth(text, font);

    // We add paddingLeft to align with where the text actually starts.
    // We clamp it slightly so the arrow doesn't look weird at the very start (0px).
    setCursorOffset(Math.max(6, textWidth + paddingLeft));
  }, []);

  const arrowOffsetForTooltip = Math.min(
    ONE_PUZZLE_TOOLTIP_ARROW_MAX,
    cursorOffset,
  );

  const [operatorActionsHidden, setOperatorActionsHidden] =
    useOperatorActionsHiddenForHunt(huntId);
  const setOperatorActionsHiddenString = useCallback(
    (value: string) => {
      setOperatorActionsHidden(value === "hide");
    },
    [setOperatorActionsHidden],
  );

  useFocusRefOnFindHotkey(searchBarRef);

  const onAdd = useCallback(
    (
      state: PuzzleModalFormSubmitPayload,
      callback: (error?: Error) => void,
    ) => {
      const { docType, ...rest } = state;
      if (!docType) {
        callback(new Error("No docType provided"));
        return;
      }

      function onAddComplete(error?: Error) {
        if (!error && addModalRef.current) {
          addModalRef.current.reset();
        }
        callback(error);
      }

      createPuzzle.call({ docType, ...rest }, onAddComplete);
    },
    [],
  );

  const setSearchString = useCallback(
    (val: string) => {
      const u = new URLSearchParams(searchParams);
      if (val) {
        u.set("q", val);
      } else {
        u.delete("q");
      }

      setSearchParams(u);
    },
    [searchParams, setSearchParams],
  );

  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback(
      (e) => {
        setSearchString(e.currentTarget.value);
        updateCursorPosition();
      },
      [setSearchString, updateCursorPosition],
    );
  const subscribersLoading = useSubscribe("subscribers.fetchAll", huntId);
  const callMembersLoading = useSubscribe("mediasoup:metadataAll", huntId);

  const displayNamesLoading = useSubscribeDisplayNames(huntId);
  const avatarsLoading = useSubscribeAvatars(huntId);

  const subscriptionsLoading =
    subscribersLoading() ||
    callMembersLoading() ||
    displayNamesLoading() ||
    avatarsLoading();

  const statusArgs = useMemo(() => ({ huntId }), [huntId]);
  const statusesSubscribe = useTypedSubscribe(statusesForHuntUsers, statusArgs); // also the statuses for users

  const statusesLoading = statusesSubscribe();
  const displayNames = useTracker(() => indexedDisplayNames(), []);

  const puzzleUsers: Record<string, string[]> = useTracker(() => {
    if (subscriptionsLoading || statusesLoading) {
      return {};
    }
    const puzzleUserStatuses = userStatusesToLastSeen(
      UserStatuses.find({ hunt: huntId }).fetch(),
    );
    const mappedUsers = Object.entries(puzzleUserStatuses).reduce((acc, k) => {
      const [userId, statusInfo] = k;
      const puzzleId = statusInfo.puzzleStatus.puzzle;
      if (!puzzleId) {
        return acc;
      }
      if (!acc[puzzleId]) {
        acc[puzzleId] = [userId];
      } else {
        acc[puzzleId].push(userId);
      }
      return acc;
    }, {});

    return mappedUsers;
  }, [subscriptionsLoading, statusesLoading, huntId]);

  const puzzleSubscribers = useTracker(() => {
    if (subscriptionsLoading) {
      return {
        none: { activeViewers: [], passiveViewers: [], rtcViewers: [] },
      };
    }

    const nextPuzzleSubs: Record<
      string,
      {
        activeViewers: string[];
        passiveViewers: string[];
        rtcViewers: string[];
      }
    > = {};
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();

    const ensurePuzzle = (pid: string) => {
      if (!Object.hasOwn(nextPuzzleSubs, pid)) {
        nextPuzzleSubs[pid] = {
          activeViewers: [],
          passiveViewers: [],
          rtcViewers: [],
        };
      }
    };

    // Process RTC Viewers
    Peers.find({}).forEach((p) => {
      ensurePuzzle(p.call);
      if (!nextPuzzleSubs[p.call].rtcViewers.includes(p.createdBy)) {
        nextPuzzleSubs[p.call].rtcViewers.push(p.createdBy);
      }
    });

    interface Candidate {
      puzzleId: string;
      updatedAt: number;
      visible: boolean;
      isInteraction: boolean;
    }
    const candidatesByUser: Record<string, Candidate[]> = {};

    const addCandidate = (uid: string, c: Candidate) => {
      if (!candidatesByUser[uid]) candidatesByUser[uid] = [];
      candidatesByUser[uid].push(c);
    };

    // Gather Subscribers
    Subscribers.find({ name: { $regex: /^puzzle:/ } }).forEach((s) => {
      // Logic for checking visibility (string or boolean)
      const isVisible = s.visible === "visible" || s.visible === true;

      addCandidate(s.user, {
        puzzleId: s.name.replace(/^puzzle:/, ""),
        updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 0,
        visible: isVisible,
        isInteraction: false,
      });
    });

    // Gather UserStatuses
    UserStatuses.find({ hunt: huntId, puzzle: { $exists: true } }).forEach(
      (s) => {
        addCandidate(s.user, {
          puzzleId: s.puzzle!,
          updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 0,
          visible: false,
          isInteraction: true,
        });
      },
    );

    // Determine Best Location & Sort
    Object.entries(candidatesByUser).forEach(([uid, locations]) => {
      let bestLocations: Candidate[] = [];
      const visible = locations.filter((l) => l.visible);

      if (visible.length > 0) {
        bestLocations = visible;
      } else {
        const recent = locations.filter(
          (l) => now - l.updatedAt < FIVE_MINUTES_MS,
        );

        if (recent.length > 0) {
          recent.sort((a, b) => {
            // If one is an interaction and the other isn't, prefer the interaction
            if (a.isInteraction !== b.isInteraction) {
              return a.isInteraction ? -1 : 1;
            }
            // Otherwise, sort by recency (newest first)
            return b.updatedAt - a.updatedAt;
          });

          bestLocations = [recent[0]];
        }
      }

      bestLocations.forEach((loc) => {
        ensurePuzzle(loc.puzzleId);
        const pData = nextPuzzleSubs[loc.puzzleId];

        if (pData.rtcViewers.includes(uid)) return;

        if (loc.visible) {
          if (!pData.activeViewers.includes(uid)) pData.activeViewers.push(uid);
        } else {
          if (!pData.passiveViewers.includes(uid))
            pData.passiveViewers.push(uid);
        }
      });
    });

    return nextPuzzleSubs;
  }, [subscriptionsLoading, huntId]);

  // Automatically focus the search bar whenever the search string changes
  // (e.g., when a tag is clicked)
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want this to trigger every time searchString changes, but we don't care about the change
  useEffect(() => {
    if (
      searchBarRef.current &&
      document.activeElement !== searchBarRef.current
    ) {
      searchBarRef.current.focus();
    }
  }, [searchString]);

  const compileMatcher = useCallback(
    (searchKeys: string[]): ((p: PuzzleType) => boolean) => {
      const tagNames: Record<string, string> = {};
      allTags.forEach((t) => {
        tagNames[t._id] = t.name.toLowerCase();
      });
      const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
      return function (puzzle) {
        const titleWords = puzzle.title.toLowerCase().split(" ");
        return lowerSearchKeys.every((key) => {
          // Every key should match at least one of the following:
          // * prefix of word in title
          // * substring of any answer
          // * substring of any tag
          if (titleWords.some((word) => word.startsWith(key))) {
            return true;
          }

          if (
            puzzle.answers.some((answer) => {
              return answer.toLowerCase().includes(key);
            })
          ) {
            return true;
          }

          const tagMatch = puzzle.tags.some((tagId) => {
            const tagName = tagNames[tagId];
            return tagName?.includes(key);
          });

          if (tagMatch) {
            return true;
          }
          if (showSolvers === "viewers") {
            const matchingViewers =
              puzzle._id in puzzleSubscribers
                ? puzzleSubscribers[puzzle._id].activeViewers.some((userId) => {
                    const user = tagNames[userId] || displayNames.get(userId);
                    return user?.toLowerCase().includes(key);
                  }) ||
                  puzzleSubscribers[puzzle._id].passiveViewers.some(
                    (userId) => {
                      const user = tagNames[userId] || displayNames.get(userId);
                      return user?.toLowerCase().includes(key);
                    },
                  ) ||
                  puzzleSubscribers[puzzle._id].rtcViewers.some((userId) => {
                    const user = tagNames[userId] || displayNames.get(userId);
                    return user?.toLowerCase().includes(key);
                  })
                : false;
            if (matchingViewers) {
              return matchingViewers;
            }
          }
          if (showSolvers !== "hide") {
            const matchingCallers =
              puzzle._id in puzzleSubscribers
                ? puzzleSubscribers[puzzle._id].rtcViewers.some((userId) => {
                    const user = tagNames[userId] || displayNames.get(userId);
                    return user?.toLowerCase().includes(key);
                  })
                : false;
            if (matchingCallers) {
              return matchingCallers;
            }
          }

          return false;
        });
      };
    },
    [allTags, puzzleSubscribers, showSolvers, displayNames],
  );

  const puzzlesMatchingSearchString = useCallback(
    (puzzles: PuzzleType[]): PuzzleType[] => {
      const searchKeys = searchString.split(" ");
      if (searchKeys.length === 1 && searchKeys[0] === "") {
        // No search query, so no need to do fancy search computation
        return puzzles;
      } else {
        const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => {
          return key.length > 0;
        });
        const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
        return puzzles.filter(isInteresting);
      }
    },
    [searchString, compileMatcher],
  );

  const puzzlesMatchingSolvedFilter = useCallback(
    (puzzles: PuzzleType[]): PuzzleType[] => {
      if (showSolved) {
        return puzzles;
      } else {
        return puzzles.filter((puzzle) => {
          // Items with no expected answer are always shown, since they're
          // generally pinned administrivia.
          const solvedness = computeSolvedness(puzzle);
          return solvedness !== "solved";
        });
      }
    },
    [showSolved],
  );

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, [setSearchString]);

  const setShowSolvedString = useCallback(
    (value: string) => {
      setShowSolved(value === "show");
    },
    [setShowSolved],
  );

  const setShowSolversString = useCallback(
    (value: "hide" | "viewing") => {
      setShowSolvers(value);
    },
    [setShowSolvers],
  );

  const showAddModal = useCallback(() => {
    if (addModalRef.current) {
      addModalRef.current.show();
      addModalRef.current.populateForm({
        title: "",
        url: "",
        tagIds: [],
      });
    }
  }, []);

  const showAddModalWithTags = useCallback((initialTags: string[]) => {
    if (addModalRef.current) {
      addModalRef.current.show();
      addModalRef.current.populateForm({
        title: "",
        url: "",
        tagIds: initialTags,
      });
    }
  }, []);

  const navigate = useNavigate();

  const bookmarkTitle = searchParams.get("title") ?? "";
  const bookmarkURL = searchParams.get("url") ?? "";

  useEffect(() => {
    if (bookmarkURL) {
      const existingPuzzle = Puzzles.findOne({
        url: { $regex: `^${bookmarkURL}` },
      });
      if (existingPuzzle) {
        navigate(`./${existingPuzzle._id}`);
      } else if (addModalRef) {
        addModalRef.current?.show();
        addModalRef.current?.populateForm({
          title: bookmarkTitle,
          url: bookmarkURL,
          tagIds: null,
        });
        setSearchParams((prev: URLSearchParams) => {
          prev.delete("url");
          prev.delete("title");
          return prev;
        });
      }
    }
  }, [bookmarkTitle, bookmarkURL, navigate, setSearchParams]);

  const renderList = useCallback(
    (
      retainedPuzzles: PuzzleType[],
      retainedDeletedPuzzles: PuzzleType[] | undefined,
      solvedOverConstrains: boolean,
      allPuzzlesCount: number,
    ) => {
      const maybeMatchWarning = solvedOverConstrains && (
        <Alert variant="info">
          No matches found in unsolved puzzles; showing matches from solved
          puzzles
        </Alert>
      );
      const retainedIds = new Set(retainedPuzzles.map((puzzle) => puzzle._id));
      const filterMessage = `Showing ${retainedPuzzles.length} of ${allPuzzlesCount} rows`;

      const bookmarkedPuzzles = retainedPuzzles.filter((puzzle) =>
        bookmarked.has(puzzle._id),
      );

      let listComponent;
      let listControls;
      // biome-ignore lint/style/useDefaultSwitchClause: migration from eslint
      switch (displayMode) {
        case "group": {
          // We group and sort first, and only filter afterward, to avoid losing the
          // relative group structure as a result of removing some puzzles from
          // consideration.
          const unfilteredGroups = puzzleGroupsByRelevance(allPuzzles, allTags);
          const puzzleGroups = filteredPuzzleGroups(
            unfilteredGroups,
            retainedIds,
          );
          listComponent = puzzleGroups.map((g) => {
            const suppressedTagIds = [];
            if (g.sharedTag) {
              suppressedTagIds.push(g.sharedTag._id);
            }
            return (
              <RelatedPuzzleGroup
                key={g.sharedTag ? g.sharedTag._id : "ungrouped"}
                huntId={huntId}
                group={g}
                noSharedTagLabel="(no group specified)"
                bookmarked={bookmarked}
                allTags={allTags}
                includeCount={false}
                canUpdate={canUpdate}
                suppressedTagIds={suppressedTagIds}
                trackPersistentExpand={searchString === ""}
                showSolvers={showSolvers}
                subscribers={puzzleSubscribers}
                puzzleUsers={puzzleUsers}
                addPuzzleCallback={showAddModalWithTags}
              />
            );
          });
          listControls = (
            <Button
              variant="secondary"
              size="sm"
              disabled={!canExpandAllGroups}
              onClick={expandAllGroups}
            >
              <FontAwesomeIcon icon={faCaretDown} /> Expand all
            </Button>
          );
          break;
        }
        case "unlock": {
          const puzzlesByUnlock = sortedBy(allPuzzles, (p) => {
            return p.createdAt;
          });
          const retainedPuzzlesByUnlock = puzzlesByUnlock.filter((p) =>
            retainedIds.has(p._id),
          );
          listComponent = (
            <PuzzleList
              puzzles={retainedPuzzlesByUnlock}
              bookmarked={bookmarked}
              allTags={allTags}
              canUpdate={canUpdate}
              showSolvers={showSolvers}
              subscribers={puzzleSubscribers}
              puzzleUsers={puzzleUsers}
            />
          );
          listControls = null;
          break;
        }
      }
      return (
        <div>
          {maybeMatchWarning}
          <PuzzleListToolbar>
            <div>{listControls}</div>
            <div>{filterMessage}</div>
            <div>
              <FontAwesomeIcon icon={faFolderOpen} key="legend-group" /> =
              group; <FontAwesomeIcon icon={faStar} key="legend-meta" /> = meta
              for; <FontAwesomeIcon icon={faMapPin} key="legend-where" /> =
              where
            </div>
          </PuzzleListToolbar>
          {bookmarkedPuzzles.length > 0 && (
            <PuzzleGroupDiv>
              <div>Bookmarked</div>
              <RelatedPuzzleList
                key="bookmarked"
                relatedPuzzles={bookmarkedPuzzles}
                sharedTag={undefined}
                bookmarked={bookmarked}
                allTags={allTags}
                canUpdate={canUpdate}
                suppressedTagIds={[]}
                showSolvers={showSolvers}
                subscribers={puzzleSubscribers}
                puzzleUsers={puzzleUsers}
              />
            </PuzzleGroupDiv>
          )}
          {listComponent}
          {retainedDeletedPuzzles && retainedDeletedPuzzles.length > 0 && (
            <RelatedPuzzleGroup
              key="deleted"
              huntId={huntId}
              group={{ puzzles: retainedDeletedPuzzles, subgroups: [] }}
              noSharedTagLabel="Deleted puzzles (operator only)"
              bookmarked={bookmarked}
              allTags={allTags}
              includeCount={false}
              canUpdate={canUpdate}
              suppressedTagIds={[]}
              trackPersistentExpand={searchString !== ""}
              subscribers={puzzleSubscribers}
              showSolvers={showSolvers}
              puzzleUsers={puzzleUsers}
              addPuzzleCallback={showAddModalWithTags}
            />
          )}
        </div>
      );
    },
    [
      displayMode,
      bookmarked,
      allPuzzles,
      allTags,
      canUpdate,
      showSolvers,
      puzzleSubscribers,
      puzzleUsers,
      huntId,
      searchString,
      showAddModalWithTags,
      canExpandAllGroups,
      expandAllGroups,
    ],
  );

  const idPrefix = useId();

  const addPuzzleContent = canAdd && (
    <>
      <PuzzleModalForm
        huntId={huntId}
        tags={allTags}
        ref={addModalRef}
        onSubmit={onAdd}
      />
      <OperatorActionsFormGroup>
        <FormLabel>View</FormLabel>
        <ButtonToolbar>
          <StyledToggleButtonGroup
            type="radio"
            name="operator-actions"
            defaultValue="show"
            value={operatorActionsHidden ? "hide" : "show"}
            onChange={setOperatorActionsHiddenString}
          >
            <ToggleButton
              id={`${idPrefix}-operator-actions-hide-button`}
              variant="outline-info"
              value="hide"
            >
              <FontAwesomeIcon icon={faPencilAlt} key="view-solver" /> Solver
            </ToggleButton>
            <ToggleButton
              id={`${idPrefix}-operator-actions-show-button`}
              variant="outline-info"
              value="show"
            >
              <FontAwesomeIcon icon={faStar} key="view-operator" /> Deputy
            </ToggleButton>
          </StyledToggleButtonGroup>
        </ButtonToolbar>
      </OperatorActionsFormGroup>
      <AddPuzzleFormGroup>
        <StyledButton variant="primary" onClick={showAddModal}>
          <FontAwesomeIcon icon={faPlus} key="add-a-puzzle" /> Add a puzzle
        </StyledButton>
      </AddPuzzleFormGroup>
    </>
  );

  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);
  const matchingSearchAndSolved = puzzlesMatchingSolvedFilter(matchingSearch);
  // Normally, we'll just show matchingSearchAndSolved, but if that produces
  // no results, and there *is* a solved puzzle that is not being displayed due
  // to the solved filter, then show that and a note that we're showing solved
  // puzzles because no unsolved puzzles matched.
  const solvedOverConstrains =
    matchingSearch.length > 0 && matchingSearchAndSolved.length === 0;
  const retainedPuzzles = solvedOverConstrains
    ? matchingSearch
    : matchingSearchAndSolved;
  const filterText = useTracker(() => {
    return showSolvers !== "hide"
      ? "Filter by title, answer, tag, or solver"
      : "Filter by title, answer, or tag";
  }, [showSolvers]);

  const onSubmitSearch: NonNullable<FormControlProps["onKeyDown"]> =
    useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          const huntId = retainedPuzzles[0]?.hunt;
          const puzzleId = retainedPuzzles[0]?._id;
          if (huntId && puzzleId && retainedPuzzles.length === 1) {
            return navigate(`/hunts/${huntId}/puzzles/${puzzleId}`);
          }
        }
      },
      [navigate, retainedPuzzles],
    );
  const retainedDeletedPuzzles =
    deletedPuzzles && puzzlesMatchingSearchString(deletedPuzzles);

  return (
    <div>
      <ViewControls $canAdd={canAdd}>
        <FormGroup>
          <FormLabel>Sort by</FormLabel>
          <ButtonToolbar>
            <StyledToggleButtonGroup
              type="radio"
              name="puzzle-view"
              defaultValue="group"
              value={displayMode}
              onChange={setDisplayMode}
            >
              <ToggleButton
                id={`${idPrefix}-view-group-button`}
                variant="outline-info"
                value="group"
              >
                <FontAwesomeIcon icon={faFolderOpen} key="sort-group" /> Group
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-view-unlock-button`}
                variant="outline-info"
                value="unlock"
              >
                <FontAwesomeIcon icon={faClock} key="sort-when-added" /> When
                added
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        <FormGroup>
          <FormLabel>Puzzles</FormLabel>
          <ButtonToolbar>
            <StyledToggleButtonGroup
              type="radio"
              name="show-solved"
              defaultValue="show"
              value={showSolved ? "show" : "hide"}
              onChange={setShowSolvedString}
            >
              <ToggleButton
                id={`${idPrefix}-solved-hide-button`}
                variant="outline-info"
                value="hide"
              >
                <FontAwesomeIcon icon={faCircle} key="puzzles-unsolved" />{" "}
                Unsolved
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-solved-show-button`}
                variant="outline-info"
                value="show"
              >
                <FontAwesomeIcon icon={faGlobe} key="puzzles-all" /> All
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        <FormGroup>
          <FormLabel>Hunters</FormLabel>
          <ButtonToolbar>
            <StyledToggleButtonGroup
              type="radio"
              name="show-solvers"
              defaultValue="hide"
              value={showSolvers}
              onChange={setShowSolversString}
            >
              <ToggleButton
                id={`${idPrefix}-solvers-hide-button`}
                variant="outline-info"
                value="hide"
              >
                <FontAwesomeIcon icon={faEyeSlash} key="hunters-hide" /> Hide
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-solvers-show-button`}
                variant="outline-info"
                value="viewers"
              >
                <FontAwesomeIcon icon={faEye} key="hunters-show" /> Show
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        {addPuzzleContent}
        <SearchFormGroup
          $canAdd={canAdd}
          controlId={`${idPrefix}-puzzle-search`}
        >
          <SearchFormLabel $canAdd={canAdd}>Search</SearchFormLabel>
          <InputGroup>
            <FormControl
              as="input"
              type="text"
              ref={searchBarRef}
              placeholder={filterText}
              value={searchString}
              onClick={updateCursorPosition}
              onKeyDown={onSubmitSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyUp={updateCursorPosition}
              onChange={onSearchStringChange}
            />
            <Button variant="secondary" onClick={clearSearch}>
              <FontAwesomeIcon icon={faEraser} content="erase-filter" />
            </Button>
          </InputGroup>
          <Overlay
            target={searchBarRef.current}
            show={isSearchFocused && retainedPuzzles.length === 1}
            placement="bottom-start"
          >
            {(props) => (
              <StyledTooltip
                id={`${idPrefix}-single-match-tooltip`}
                $cursorOffset={arrowOffsetForTooltip}
                {...props}
              >
                Press <kbd>Enter</kbd> to go to{" "}
                <strong>{retainedPuzzles[0]?.title}</strong>
              </StyledTooltip>
            )}
          </Overlay>
        </SearchFormGroup>
      </ViewControls>
      {renderList(
        retainedPuzzles,
        retainedDeletedPuzzles,
        solvedOverConstrains,
        allPuzzles.length,
      )}
    </div>
  );
};

const PuzzleListPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  useBreadcrumb({ title: "Puzzles", path: `/hunts/${huntId}/puzzles` });

  // Assertion is safe because hunt is already subscribed and checked by HuntApp
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);
  const { canAdd, canUpdate } = useTracker(() => {
    return {
      canAdd: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
      canUpdate: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);

  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: isAdmin,
  });

  useTypedSubscribe(presenceForHunt, { huntId });

  const loading = puzzlesLoading();

  // Don't bother including this in loading - it's ok if they trickle in
  useTypedSubscribe(puzzleActivityForHunt, { huntId });
  return loading ? (
    <span>loading...</span>
  ) : (
    <div>
      <HuntNavWrapper>
        <HuntNav />
      </HuntNavWrapper>

      <PuzzleListView
        huntId={huntId}
        canAdd={canAdd}
        canUpdate={canUpdate}
        loading={loading}
      />
    </div>
  );
};

export default PuzzleListPage;
