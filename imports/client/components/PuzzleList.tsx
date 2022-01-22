/* eslint-disable max-len */
import React from 'react';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tag';
import Puzzle from './Puzzle';

const PuzzleList = React.memo(({
  puzzles, allTags, canUpdate, suppressTags, segmentAnswers,
}: {
  // The puzzles to show in this list
  puzzles: PuzzleType[];
  // All tags for this hunt, including those not used by any puzzles
  allTags: TagType[];
  canUpdate: boolean;
  suppressTags?: string[];
  segmentAnswers?: boolean;
}) => {
  // This component just renders the puzzles provided, in order.
  // Adjusting order based on tags, tag groups, etc. is to be done at
  // a higher layer.
  const renderedPuzzles = [];
  for (let i = 0; i < puzzles.length; i++) {
    const puz = puzzles[i];
    renderedPuzzles.push(<Puzzle
      key={puz._id}
      puzzle={puz}
      allTags={allTags}
      canUpdate={canUpdate}
      suppressTags={suppressTags}
      segmentAnswers={segmentAnswers}
    />);
  }

  return (
    <div className="puzzle-list">
      {renderedPuzzles}
    </div>
  );
});

export default PuzzleList;
