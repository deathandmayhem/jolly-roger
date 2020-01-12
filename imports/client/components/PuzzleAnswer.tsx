import React from 'react';

interface PuzzleAnswerProps {
  answer: string;
}

class PuzzleAnswer extends React.PureComponent<PuzzleAnswerProps> {
  static displayName = 'PuzzleAnswer';

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
