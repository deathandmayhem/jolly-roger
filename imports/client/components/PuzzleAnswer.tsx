import React from 'react';

interface PuzzleAnswerProps {
  answer: string;
}

const PuzzleAnswer = (props: PuzzleAnswerProps) => {
  return (
    <span className="answer">
      {props.answer}
    </span>
  );
};

export default React.memo(PuzzleAnswer);
