import React from 'react';
import styled from 'styled-components';
import { MonospaceFontFamily } from './styling/constants';

const PuzzleAnswerSpan = styled.span`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 300;
`;

const PuzzleAnswerSegment = styled.span`
  & + & {
    margin-left: .4em;
  }
`;

const PuzzleAnswer = React.memo(({
  answer, className, respace = false, segmentSize = 5,
}: {
  answer: string;
  className?: string;
  // If respace is set, answers are formatted without spaces and grouped into segments of length
  // segmentSize. If segmentSize is zero or negative, the effect is simply to strip spaces.
  respace?: boolean;
  segmentSize?: number;
}) => {
  const respacedAnswer = respace ? answer.replace(/\s+/g, '') : answer;
  let formattedAnswer: React.ReactNode = respacedAnswer;
  if (respace && segmentSize > 0) {
    // Use Intl.Segmenter (stage 3 proposal) if available to properly segment grapheme clusters
    // Typescript is unaware of it, so there are a few any casts...
    let graphemes:string[];
    if (Intl !== undefined && (Intl as any).Segmenter !== undefined) {
      const graphemeSegmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
      graphemes = Array.from(graphemeSegmenter.segment(respacedAnswer), (s) => (s as any).segment);
    } else {
      graphemes = Array.from(respacedAnswer);
    }
    const segments = Array.from(new Array(Math.ceil(graphemes.length / segmentSize)), (_x, i) => {
      return graphemes.slice(i * segmentSize, (i + 1) * segmentSize);
    });
    formattedAnswer = segments.map((segment, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <PuzzleAnswerSegment key={`segment-${i}`}>
        {segment}
      </PuzzleAnswerSegment>
    ));
  }
  return (
    <PuzzleAnswerSpan className={className}>
      {formattedAnswer}
    </PuzzleAnswerSpan>
  );
});

export default PuzzleAnswer;
