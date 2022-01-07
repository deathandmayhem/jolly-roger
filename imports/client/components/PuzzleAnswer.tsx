import React from 'react';

interface PuzzleAnswerProps {
  answer: string;
  // If respace is set, answers are formatted without spaces and grouped into segments of length
  // segmentSize. If segmentSize is zero or negative, the effect is simply to strip spaces.
  respace?: boolean;
  segmentSize?: number;
}

const PuzzleAnswer = React.memo((props: PuzzleAnswerProps) => {
  const respace = props.respace ?? false;
  const segmentSize = Math.floor(props.segmentSize ?? 5);
  const respacedAnswer = respace ? props.answer.replace(/\s+/g, '') : props.answer;
  let formattedAnswer : React.ReactNode = respacedAnswer;
  if (respace && segmentSize > 0) {
    const segments = respacedAnswer.match(new RegExp(`.{1,${segmentSize}}`, 'g')) || [];
    formattedAnswer = segments.map((segment, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <span key={`segment-${i}`} className="answer-segment">
        {segment}
      </span>
    ));
  }
  return (
    <span className="answer">
      {formattedAnswer}
    </span>
  );
});

export default PuzzleAnswer;
