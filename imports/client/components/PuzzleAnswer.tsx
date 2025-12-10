import React from "react";
import styled, { css } from "styled-components";
import { MonospaceFontFamily } from "./styling/constants";

const PuzzleAnswerSpan = styled.span<{
  $breakable: boolean;
  $indented: boolean;
}>`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 400;
  ${({ $breakable }) =>
    $breakable &&
    css`
      overflow-wrap: break-word;
      overflow: hidden;
    `}
  ${({ $indented }) =>
    $indented &&
    css`
      display: block;
      min-width: 0;
      text-indent: -1.2em;
      padding-left: 1.2em;
    `}
`;

const PuzzleAnswerSegment = styled.span`
  overflow-wrap: normal;
  margin-right: 0.4em;

  :last-child {
    margin-right: 0;
  }
`;

// Clean answers for presentation as blocks of characters.
// To try to preserve unexpected content-ful special characters (such as emoji), only remove
// non-alphanumeric characters expected in a sentence or title.
function removePunctuation(answer: string) {
  return answer
    .toUpperCase()
    .replace(/[\s.?!,;:\-_()'\u2018\u2019"\u201C\u201D]+/gu, "");
}

const PuzzleAnswer = React.memo(
  ({
    answer,
    className,
    respace = false,
    segmentSize = 5,
    indented = false,
    breakable = false,
  }: {
    answer: string;
    className?: string;
    // If respace is set, answers are formatted without spaces and punctuation and grouped into
    // segments of length segmentSize. If segmentSize is zero or negative, the effect is simply to
    // strip spaces and punctuation.
    respace?: boolean;
    segmentSize?: number;
    breakable?: boolean;
    indented?: boolean;
  }) => {
    let formattedAnswer: React.ReactNode = answer;
    if (respace && segmentSize > 0) {
      const respacedAnswer = removePunctuation(answer);
      // Use Intl.Segmenter (stage 3 proposal) if available to properly segment grapheme clusters
      // Typescript is unaware of it, so there are a few any casts...
      let graphemes: string[];
      if (Intl?.Segmenter !== undefined) {
        const graphemeSegmenter = new Intl.Segmenter("en", {
          granularity: "grapheme",
        });
        graphemes = Array.from(
          graphemeSegmenter.segment(respacedAnswer),
          (s) => s.segment,
        );
      } else {
        graphemes = Array.from(respacedAnswer);
      }
      const segments = Array.from(
        new Array(Math.ceil(graphemes.length / segmentSize)),
        (_x, i) => {
          return graphemes.slice(i * segmentSize, (i + 1) * segmentSize);
        },
      );
      formattedAnswer = segments.map((segment, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: migration from eslint
        <PuzzleAnswerSegment key={`segment-${i}`}>
          {segment}
          <wbr />
        </PuzzleAnswerSegment>
      ));
    }
    return (
      <PuzzleAnswerSpan
        $breakable={breakable}
        $indented={indented}
        className={className}
      >
        {formattedAnswer}
      </PuzzleAnswerSpan>
    );
  },
);

export default PuzzleAnswer;
export { removePunctuation };
