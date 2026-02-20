import React from "react";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import { sortPuzzlesByRelevanceWithinPuzzleGroup } from "../../lib/puzzle-sort-and-group";
import PuzzleList from "./PuzzleList";

const RelatedPuzzleList = React.memo(
  ({
    relatedPuzzles,
    bookmarked,
    allTags,
    canUpdate,
    sharedTags,
    suppressedTagIds,
    segmentAnswers,
  }: {
    relatedPuzzles: PuzzleType[];
    bookmarked: Set<string>;
    allTags: TagType[];
    canUpdate: boolean;
    sharedTags: TagType[];
    suppressedTagIds: string[];
    segmentAnswers?: boolean;
  }) => {
    // Sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.
    const tagIndex = indexedById(allTags);
    const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
      relatedPuzzles,
      sharedTags,
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
      />
    );
  },
);

export default RelatedPuzzleList;
export { RelatedPuzzleList };
