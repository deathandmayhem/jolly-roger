import React from 'react';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import Puzzle from './Puzzle';

/* eslint-disable max-len */

interface PuzzleListProps {
  // The puzzles to show in this list
  puzzles: PuzzleType[];
  // All tags for this hunt, including those not used by any puzzles
  allTags: TagType[];
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressTags?: string[];
}

class PuzzleList extends React.PureComponent<PuzzleListProps> {
  static displayName = 'PuzzleList';

  render() {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    const puzzles = [];
    for (let i = 0; i < this.props.puzzles.length; i++) {
      const puz = this.props.puzzles[i];
      puzzles.push(<Puzzle
        key={puz._id}
        puzzle={puz}
        allTags={this.props.allTags}
        layout={this.props.layout}
        canUpdate={this.props.canUpdate}
        suppressTags={this.props.suppressTags}
      />);
    }

    if (this.props.layout === 'table') {
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
  }
}

export default PuzzleList;
