import React from 'react';
import emojify from '../emojify';

interface PuzzleAnswerProps {
  answer: string;
}

class PuzzleAnswer extends React.PureComponent<PuzzleAnswerProps> {
  static displayName = 'PuzzleAnswer';

  render() {
    return (
      <span className="answer-wrapper">
        <span className="answer" dangerouslySetInnerHTML={{ __html: emojify(this.props.answer) }} />
      </span>
    );
  }
}

export default PuzzleAnswer;
