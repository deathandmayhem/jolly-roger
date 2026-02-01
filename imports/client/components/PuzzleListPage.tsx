import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useId,
  useRef,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import InputGroup from "react-bootstrap/InputGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import styled, { css } from "styled-components";
import { sortedBy } from "../../lib/listUtils";
import Bookmarks from "../../lib/models/Bookmarks";
import Hunts from "../../lib/models/Hunts";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import puzzleActivityForHunt from "../../lib/publications/puzzleActivityForHunt";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import {
  filteredPuzzleGroups,
  puzzleGroupsByRelevance,
} from "../../lib/puzzle-sort-and-group";
import { computeSolvedness } from "../../lib/solvedness";
import createPuzzle from "../../methods/createPuzzle";
import {
  useHuntPuzzleListCollapseGroups,
  useHuntPuzzleListDisplayMode,
  useHuntPuzzleListShowSolved,
  useOperatorActionsHiddenForHunt,
} from "../hooks/persisted-state";
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import { compilePuzzleMatcher } from "../search";
import HuntNav from "./HuntNav";
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
  grid-template-columns: auto auto auto 1fr;
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
  grid-column: ${(props) => (props.$canAdd ? 1 : 3)} / -1;
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
      !canUpdate || loading
        ? undefined
        : Puzzles.findDeleted({ hunt: huntId }).fetch(),
    [canUpdate, huntId, loading],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get("q") ?? "";
  const addModalRef = useRef<PuzzleModalFormHandle>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const [displayMode, setDisplayMode] = useHuntPuzzleListDisplayMode(huntId);
  const [showSolved, setShowSolved] = useHuntPuzzleListShowSolved(huntId);
  const [huntPuzzleListCollapseGroups, setHuntPuzzleListCollapseGroups] =
    useHuntPuzzleListCollapseGroups(huntId);
  const expandAllGroups = useCallback(() => {
    setHuntPuzzleListCollapseGroups({});
  }, [setHuntPuzzleListCollapseGroups]);
  const canExpandAllGroups =
    displayMode === "group" &&
    Object.values(huntPuzzleListCollapseGroups).some((collapsed) => collapsed);

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
      },
      [setSearchString],
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
        const isInteresting = compilePuzzleMatcher(
          allTags,
          searchKeysWithEmptyKeysRemoved,
        );
        return puzzles.filter(isInteresting);
      }
    },
    [searchString, allTags],
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

  const showAddModal = useCallback(() => {
    if (addModalRef.current) {
      addModalRef.current.show();
    }
  }, []);

  const { t } = useTranslation();

  const renderList = useCallback(
    (
      retainedPuzzles: PuzzleType[],
      retainedDeletedPuzzles: PuzzleType[] | undefined,
      solvedOverConstrains: boolean,
      allPuzzlesCount: number,
    ) => {
      const maybeMatchWarning = solvedOverConstrains && (
        <Alert variant="info">
          {t(
            "puzzleList.maybeMatchWarning",
            "No matches found in unsolved puzzles; showing matches from solved puzzles",
          )}
        </Alert>
      );
      const retainedIds = new Set(retainedPuzzles.map((puzzle) => puzzle._id));
      const filterMessage = t(
        "puzzleList.filteredPuzzleCountMessage",
        "Showing {{retainedCount}} of {{allPuzzlesCount}} items",
        {
          retainedCount: retainedPuzzles.length,
          allPuzzlesCount: allPuzzlesCount,
        },
      );

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
                noSharedTagLabel={`(${t("puzzleList.noGroupSpecified", "no group specified")})`}
                bookmarked={bookmarked}
                allTags={allTags}
                includeCount={false}
                canUpdate={canUpdate}
                suppressedTagIds={suppressedTagIds}
                trackPersistentExpand={searchString === ""}
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
              <FontAwesomeIcon icon={faCaretDown} />{" "}
              {t("common.expandAll", "Expand all")}
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
          </PuzzleListToolbar>
          {bookmarkedPuzzles.length > 0 && (
            <PuzzleGroupDiv>
              <div>{t("puzzleList.bookmarked", "Bookmarked")}</div>
              <RelatedPuzzleList
                key="bookmarked"
                relatedPuzzles={bookmarkedPuzzles}
                sharedTag={undefined}
                bookmarked={bookmarked}
                allTags={allTags}
                canUpdate={canUpdate}
                suppressedTagIds={[]}
              />
            </PuzzleGroupDiv>
          )}
          {listComponent}
          {retainedDeletedPuzzles && retainedDeletedPuzzles.length > 0 && (
            <RelatedPuzzleGroup
              key="deleted"
              huntId={huntId}
              group={{ puzzles: retainedDeletedPuzzles, subgroups: [] }}
              noSharedTagLabel={t(
                "puzzleList.deletedPuzzlesGroup",
                "Deleted puzzles (operator only)",
              )}
              bookmarked={bookmarked}
              allTags={allTags}
              includeCount={false}
              canUpdate={canUpdate}
              suppressedTagIds={[]}
              trackPersistentExpand={searchString === ""}
            />
          )}
        </div>
      );
    },
    [
      huntId,
      displayMode,
      allPuzzles,
      allTags,
      canUpdate,
      searchString,
      canExpandAllGroups,
      expandAllGroups,
      bookmarked,
      t,
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
        <FormLabel>
          {t("puzzleList.operatorInterface", "Operator Interface")}
        </FormLabel>
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
              {t("common.off", "Off")}
            </ToggleButton>
            <ToggleButton
              id={`${idPrefix}-operator-actions-show-button`}
              variant="outline-info"
              value="show"
            >
              {t("common.on", "On")}
            </ToggleButton>
          </StyledToggleButtonGroup>
        </ButtonToolbar>
      </OperatorActionsFormGroup>
      <AddPuzzleFormGroup>
        <StyledButton variant="primary" onClick={showAddModal}>
          <FontAwesomeIcon icon={faPlus} />{" "}
          {t("puzzle.edit.addPuzzle", "Add a puzzle")}
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
  const retainedDeletedPuzzles =
    deletedPuzzles && puzzlesMatchingSearchString(deletedPuzzles);

  return (
    <div>
      <ViewControls $canAdd={canAdd}>
        <FormGroup>
          <FormLabel>{t("puzzleList.organizeBy", "Organize by")}</FormLabel>
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
                {t("puzzleList.byGroup", "Group")}
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-view-unlock-button`}
                variant="outline-info"
                value="unlock"
              >
                {t("puzzleList.byUnlock", "Unlock")}
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        <FormGroup>
          <FormLabel>
            {t("puzzleList.solvedPuzzles", "Solved puzzles")}
          </FormLabel>
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
                {t("common.hidden", "Hidden")}
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-solved-show-button`}
                variant="outline-info"
                value="show"
              >
                {t("common.shown", "Shown")}
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>
        {addPuzzleContent}
        <SearchFormGroup
          $canAdd={canAdd}
          controlId={`${idPrefix}-puzzle-search`}
        >
          <SearchFormLabel $canAdd={canAdd}>
            {t("common.search", "Search")}
          </SearchFormLabel>
          <InputGroup>
            <FormControl
              as="input"
              type="text"
              ref={searchBarRef}
              placeholder={t(
                "puzzleList.filterByPlaceholder",
                "Filter by title, answer, or tag",
              )}
              value={searchString}
              onChange={onSearchStringChange}
            />
            <Button variant="secondary" onClick={clearSearch}>
              <FontAwesomeIcon icon={faEraser} />
            </Button>
          </InputGroup>
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
    includeDeleted: canUpdate,
  });
  const loading = puzzlesLoading();

  // Don't bother including this in loading - it's ok if they trickle in
  useTypedSubscribe(puzzleActivityForHunt, { huntId });

  const { t } = useTranslation();

  return loading ? (
    <span>{t("common.loading", "loading")}...</span>
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
