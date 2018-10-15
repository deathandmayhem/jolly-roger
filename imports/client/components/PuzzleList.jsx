import React from 'react';
import PropTypes from 'prop-types';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import { puzzleShape, tagShape } from './PuzzleComponents.jsx';
import Puzzle from './Puzzle.jsx';

/* eslint-disable max-len */

const PuzzleList = React.createClass({
  displayName: 'PuzzleList',
  propTypes: {
    puzzles: PropTypes.arrayOf(PropTypes.shape(puzzleShape)).isRequired, // The puzzles to show in this list
    allTags: PropTypes.arrayOf(PropTypes.shape(tagShape)).isRequired, // All tags for this hunt, including those not used by any puzzles
    layout: PropTypes.string.isRequired,
    canUpdate: PropTypes.bool.isRequired,
    suppressTags: PropTypes.arrayOf(PropTypes.string),
  },
  mixins: [PureRenderMixin],
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
  },
});

export default PuzzleList;
