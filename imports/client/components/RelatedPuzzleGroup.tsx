import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { TagType } from "../../lib/models/Tags";
import type { PuzzleGroup } from "../../lib/puzzle-sort-and-group";
import { useHuntPuzzleListCollapseGroup } from "../hooks/persisted-state";
import RelatedPuzzleList from "./RelatedPuzzleList";
import Tag from "./Tag";
import { Theme } from "../theme";
import { Badge, Button } from "react-bootstrap";
import { computeSolvedness } from "../../lib/solvedness";

const AddButton = styled(Button)<{ theme: Theme }>`
  display: inline;
  align-items: center;
  margin: 2px 4px 2px 0;
  padding: 2px 6px;
  border-radius: 4px;
  vertical-align: top;
`;

const GroupInfoDiv = styled(Badge)<{ theme: Theme }>`
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
  vertical-align: top;
`;

export const PuzzleGroupDiv = styled.div`
  &:not(:last-child) {
    margin-bottom: 16px;
  }
`;

const PuzzleGroupHeader = styled.div`
  display: block;

  &:hover {
    cursor: pointer;
  }

  min-height: 32px;
`;

const PuzzleListWrapper = styled.div`
  padding-left: 1.25em;
`;

const NoSharedTagLabel = styled.div`
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
  background-color: transparent;
  color: #808080;
`;

const RelatedPuzzleGroup = ({
  huntId,
  group,
  noSharedTagLabel = "(no tag)",
  allTags,
  bookmarked,
  includeCount,
  canUpdate,
  suppressedTagIds,
  trackPersistentExpand,
  showSolvers,
  subscribers,
  puzzleUsers,
  addPuzzleCallback,
}: {
  huntId: string;
  group: PuzzleGroup;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel?: string;
  bookmarked: Set<string>;
  allTags: TagType[];
  includeCount?: boolean;
  canUpdate: boolean;
  suppressedTagIds: string[];
  trackPersistentExpand: boolean;
  showSolvers: "viewers" | "hide" | "active";
  subscribers: Record<string, Record<string, string[]>>;
  puzzleUsers: Record<string, string[]>;
  addPuzzleCallback: (initialTags: string[]) => void;
}) => {
  const openAddPuzzleModalWithTags = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const initialTags = suppressedTagIds;
      addPuzzleCallback(initialTags);
    },
    [addPuzzleCallback, suppressedTagIds],
  );

  const [persistentCollapsed, setPersistentCollapsed] =
    useHuntPuzzleListCollapseGroup(
      huntId,
      group.sharedTag?._id ?? noSharedTagLabel,
    );
  const [nonPersistentCollapsed, setNonPersistentCollapsed] = useState(false);
  const lastTrackPersistentExpand = useRef(trackPersistentExpand);
  useEffect(() => {
    if (trackPersistentExpand !== lastTrackPersistentExpand.current) {
      lastTrackPersistentExpand.current = trackPersistentExpand;
      setNonPersistentCollapsed(false);
    }
  }, [trackPersistentExpand]);
  const toggleCollapse = useCallback(() => {
    if (trackPersistentExpand) {
      setPersistentCollapsed((prevCollapsed) => !prevCollapsed);
    } else {
      setNonPersistentCollapsed((prevCollapsed) => !prevCollapsed);
    }
  }, [setPersistentCollapsed, trackPersistentExpand]);
  const collapsed = trackPersistentExpand
    ? persistentCollapsed
    : nonPersistentCollapsed;

  const { puzzles: relatedPuzzles, sharedTag } = group;

  const puzzlePlural = relatedPuzzles.length === 1 ? "puzzle" : "puzzles";
  const countString = `(${relatedPuzzles.length} other ${puzzlePlural})`;
  const allSuppressedTagIds = [...suppressedTagIds];
  if (sharedTag) {
    allSuppressedTagIds.push(sharedTag._id);
  }

  const solvablePuzzles = relatedPuzzles.filter(
    (p) => computeSolvedness(p) === "unsolved",
  ).length;
  const solvedPuzzles = relatedPuzzles.filter(
    (p) => computeSolvedness(p) === "solved",
  ).length;

  let solveText = null;
  if (solvablePuzzles > 0 && solvablePuzzles > solvedPuzzles) {
    solveText = `${solvablePuzzles} out of ${solvedPuzzles + solvablePuzzles} puzzle${solvedPuzzles + solvablePuzzles > 1 ? "s" : ""} unsolved`;
  }
  return (
    <PuzzleGroupDiv>
      <PuzzleGroupHeader onClick={toggleCollapse}>
        <FontAwesomeIcon
          fixedWidth
          icon={collapsed ? faCaretRight : faCaretDown}
        />
        {sharedTag ? (
          <>
            <Tag tag={sharedTag} linkToSearch={false} popoverRelated={false} />
            {solveText && (
              <GroupInfoDiv bg="secondary">{solveText}</GroupInfoDiv>
            )}
            <AddButton
              size="sm"
              variant="outline-secondary"
              onClick={openAddPuzzleModalWithTags}
            >
              <FontAwesomeIcon icon={faPlus} /> add puzzle here
            </AddButton>
          </>
        ) : (
          <NoSharedTagLabel>{noSharedTagLabel}</NoSharedTagLabel>
        )}
        {includeCount && <span>{countString}</span>}
      </PuzzleGroupHeader>
      {collapsed ? null : (
        <PuzzleListWrapper>
          <RelatedPuzzleList
            relatedPuzzles={relatedPuzzles}
            bookmarked={bookmarked}
            allTags={allTags}
            canUpdate={canUpdate}
            sharedTag={sharedTag}
            suppressedTagIds={allSuppressedTagIds}
            showSolvers={showSolvers}
            subscribers={subscribers}
            puzzleUsers={puzzleUsers}
          />
          {group.subgroups.map((subgroup) => {
            const subgroupSuppressedTagIds = [...allSuppressedTagIds];
            if (subgroup.sharedTag) {
              subgroupSuppressedTagIds.push(subgroup.sharedTag._id);
            }
            return (
              <RelatedPuzzleGroup
                key={subgroup.sharedTag ? subgroup.sharedTag._id : "ungrouped"}
                huntId={huntId}
                group={subgroup}
                noSharedTagLabel={noSharedTagLabel}
                bookmarked={bookmarked}
                allTags={allTags}
                includeCount={includeCount}
                canUpdate={canUpdate}
                suppressedTagIds={subgroupSuppressedTagIds}
                trackPersistentExpand={trackPersistentExpand}
                showSolvers={showSolvers}
                subscribers={subscribers}
                addPuzzleCallback={addPuzzleCallback}
                puzzleUsers={puzzleUsers}
              />
            );
          })}
        </PuzzleListWrapper>
      )}
    </PuzzleGroupDiv>
  );
};

export default RelatedPuzzleGroup;
