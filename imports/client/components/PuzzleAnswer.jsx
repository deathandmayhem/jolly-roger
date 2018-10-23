import React from 'react';
import PropTypes from 'prop-types';

class PuzzleAnswer extends React.PureComponent {
  static displayName = 'PuzzleAnswer';

  static propTypes = {
    answer: PropTypes.string.isRequired,
  };

  render() {
    return (
      <span className="answer-wrapper">
        <span className="answer">
          {this.props.answer}
        </span>
      </span>
    );
  }
}

export default PuzzleAnswer;
