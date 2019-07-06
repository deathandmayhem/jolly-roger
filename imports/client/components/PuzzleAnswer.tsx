import * as React from 'react';
import * as PropTypes from 'prop-types';

interface PuzzleAnswerProps {
  answer: string;
}

class PuzzleAnswer extends React.PureComponent<PuzzleAnswerProps> {
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
