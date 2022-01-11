/* eslint-disable max-len */
import React from 'react';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tag';
import Puzzle from './Puzzle';

interface PuzzleListProps {
  // The puzzles to show in this list
  puzzles: PuzzleType[];
  // All tags for this hunt, including those not used by any puzzles
  allTags: TagType[];
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressTags?: string[];
  segmentAnswers?: boolean;
}

const PuzzleList = React.memo((props: PuzzleListProps) => {
  // This component just renders the puzzles provided, in order.
  // Adjusting order based on tags, tag groups, etc. is to be done at
  // a higher layer.
  const puzzles = [];
  for (let i = 0; i < props.puzzles.length; i++) {
    const puz = props.puzzles[i];
    puzzles.push(<Puzzle
      key={puz._id}
      puzzle={puz}
      allTags={props.allTags}
      layout={props.layout}
      canUpdate={props.canUpdate}
      suppressTags={props.suppressTags}
      segmentAnswers={props.segmentAnswers}
    />);
  }

  if (props.layout === 'table') {
    return (
      <table className="puzzle-list">
        <tbody>
          {puzzles}
        </tbody>
      </table>
    );
  }
  return (
    <div className="puzzle-list">
      {puzzles}
    </div>
  );
});

export default PuzzleList;
