import React from "react";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import { puzzleInterestingness } from "../../lib/puzzle-sort-and-group";
import PuzzleList from "./PuzzleList";
import { ChatMessageType } from "../../lib/models/ChatMessages";

function sortPuzzlesByRelevanceWithinPuzzleGroup(
  puzzles: PuzzleType[],
  sharedTag: TagType | undefined,
  indexedTags: Map<string, TagType>,
) {
  let group: string;
  if (sharedTag && sharedTag.name.lastIndexOf("group:", 0) === 0) {
    group = sharedTag.name.slice("group:".length);
  }
  const sortedPuzzles = puzzles.slice(0);
  sortedPuzzles.sort((a, b) => {
    const ia = puzzleInterestingness(a, indexedTags, group);
    const ib = puzzleInterestingness(b, indexedTags, group);
    if (ia !== ib) {
      return ia - ib;
    } else {
      // Sort puzzles by creation time otherwise.
      return +a.createdAt - +b.createdAt;
    }
  });
  return sortedPuzzles;
}

const RelatedPuzzleList = React.memo(
  ({
    relatedPuzzles,
    bookmarked,
    allTags,
    canUpdate,
    sharedTag,
    suppressedTagIds,
    showSolvers,
    segmentAnswers,
    subscribers,
    puzzleUsers,
  }: {
    relatedPuzzles: PuzzleType[];
    bookmarked: Set<string>;
    allTags: TagType[];
    canUpdate: boolean;
    sharedTag: TagType | undefined;
    suppressedTagIds: string[];
    showSolvers: "viewers" | "hide" | "active";
    segmentAnswers?: boolean;
    subscribers: Record<string, Record<string, string[]>>;
    puzzleUsers: Record<string, string[]>;
  }) => {
    // Sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.
    const tagIndex = indexedById(allTags);
    const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
      relatedPuzzles,
      sharedTag,
      tagIndex,
    );
    return (
      <PuzzleList
        puzzles={sortedPuzzles}
        bookmarked={bookmarked}
        allTags={allTags}
        canUpdate={canUpdate}
        suppressTags={suppressedTagIds}
        segmentAnswers={segmentAnswers}
        showSolvers={showSolvers}
        subscribers={subscribers}
        puzzleUsers={puzzleUsers}
      />
    );
  },
);

export default RelatedPuzzleList;
export { RelatedPuzzleList, sortPuzzlesByRelevanceWithinPuzzleGroup };
