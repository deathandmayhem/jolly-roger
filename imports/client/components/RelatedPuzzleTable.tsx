import React from 'react';
import { indexedById } from '../../lib/listUtils';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { TagType } from '../../lib/schemas/Tag';
import PuzzleTable from './PuzzleTable';
import { sortPuzzlesByRelevanceWithinPuzzleGroup } from './RelatedPuzzleList';

const RelatedPuzzleTable = React.memo(({
  relatedPuzzles, allTags, sharedTag, segmentAnswers,
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
    tagIndex
  );
  return (
    <PuzzleTable
      puzzles={sortedPuzzles}
      segmentAnswers={segmentAnswers}
    />
  );
});

export default RelatedPuzzleTable;
