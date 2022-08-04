import { _ } from 'meteor/underscore';
import React from 'react';
import { puzzleInterestingness } from '../../lib/puzzle-sort-and-group';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { TagType } from '../../lib/schemas/Tag';
import PuzzleList from './PuzzleList';

function sortPuzzlesByRelevanceWithinPuzzleGroup(
  puzzles: PuzzleType[],
  sharedTag: TagType | undefined,
  indexedTags: Record<string, TagType>
) {
  let group: string;
  if (sharedTag && sharedTag.name.lastIndexOf('group:', 0) === 0) {
    group = sharedTag.name.slice('group:'.length);
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

const RelatedPuzzleList = React.memo(({
  relatedPuzzles, allTags, canUpdate, sharedTag, suppressedTagIds, segmentAnswers,
}: {
  relatedPuzzles: PuzzleType[];
  allTags: TagType[];
  canUpdate: boolean;
  sharedTag: TagType | undefined;
  suppressedTagIds: string[];
  segmentAnswers?: boolean;
}) => {
  // Sort the puzzles within each tag group by interestingness.  For instance, metas
  // should probably be at the top of the group, then of the round puzzles, unsolved should
  // maybe sort above solved, and then perhaps by unlock order.
  const tagIndex = _.indexBy(allTags, '_id');
  const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
    relatedPuzzles,
    sharedTag,
    tagIndex
  );
  return (
    <PuzzleList
      puzzles={sortedPuzzles}
      allTags={allTags}
      canUpdate={canUpdate}
      suppressTags={suppressedTagIds}
      segmentAnswers={segmentAnswers}
    />
  );
});

export default RelatedPuzzleList;
export { RelatedPuzzleList, sortPuzzlesByRelevanceWithinPuzzleGroup };
