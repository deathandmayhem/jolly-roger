import React from "react";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import PuzzleTable from "./PuzzleTable";
import { sortPuzzlesByRelevanceWithinPuzzleGroup } from "../../lib/puzzle-sort-and-group";

const RelatedPuzzleTable = React.memo(
  ({
    relatedPuzzles,
    allTags,
    sharedTag,
    segmentAnswers,
  }: {
    relatedPuzzles: PuzzleType[];
    allTags: TagType[];
    sharedTag: TagType | undefined;
    segmentAnswers?: boolean;
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
      <PuzzleTable puzzles={sortedPuzzles} segmentAnswers={segmentAnswers} />
    );
  },
);

export default RelatedPuzzleTable;
