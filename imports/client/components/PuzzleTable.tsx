import React from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { PuzzleType } from '../../lib/schemas/puzzle';
import PuzzleAnswer from './PuzzleAnswer';
import {
  ExpectsNoAnswersPuzzleBackgroundColor,
  SolvedPuzzleBackgroundColor,
  UnsolvedPuzzleBackgroundColor,
} from './styling/constants';

const PuzzleTableEl = styled.table`
  width: 100%;
  max-width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;
`;

const PuzzleTableTr = styled.tr<{
  expectsNoAnswers: boolean;
  isSolved: boolean;
  isUnsolved: boolean;
}>`
  ${({ expectsNoAnswers }) => expectsNoAnswers && css`
    background-color: ${ExpectsNoAnswersPuzzleBackgroundColor};
  `}
  ${({ isSolved }) => isSolved && css`
    background-color: ${SolvedPuzzleBackgroundColor};
  `}
  ${({ isUnsolved }) => isUnsolved && css`
    background-color: ${UnsolvedPuzzleBackgroundColor};
  `}
`;

const PuzzleTableCell = styled.td`
  padding: 0px 4px;
  vertical-align: baseline;
`;

const PuzzleTableRow = ({ puzzle, segmentAnswers }: {
  puzzle: PuzzleType;
  segmentAnswers?: boolean;
}) => {
  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
  const answers = puzzle.answers.map((answer, i) => {
    return (
      // eslint-disable-next-line react/no-array-index-key
      <PuzzleAnswer key={`${i}-${answer}`} answer={answer} respace={segmentAnswers} />
    );
  });

  const expectsNoAnswers = puzzle.expectedAnswerCount === 0;
  const isSolved = puzzle.expectedAnswerCount > 0 &&
    puzzle.answers.length >= puzzle.expectedAnswerCount;
  const isUnsolved = puzzle.expectedAnswerCount > 0 &&
    puzzle.answers.length < puzzle.expectedAnswerCount;

  return (
    <PuzzleTableTr expectsNoAnswers={expectsNoAnswers} isSolved={isSolved} isUnsolved={isUnsolved}>
      <PuzzleTableCell>
        <Link to={linkTarget}>{puzzle.title}</Link>
      </PuzzleTableCell>
      <PuzzleTableCell>
        {answers}
      </PuzzleTableCell>
    </PuzzleTableTr>
  );
};

const PuzzleTable = React.memo(({
  puzzles, segmentAnswers,
}: {
  puzzles: PuzzleType[];
  segmentAnswers?: boolean;
}) => {
  const tableRows = puzzles.map((puzzle) => {
    return (
      <PuzzleTableRow key={puzzle._id} puzzle={puzzle} segmentAnswers={segmentAnswers} />
    );
  });

  return (
    <PuzzleTableEl>
      <tbody>
        {tableRows}
      </tbody>
    </PuzzleTableEl>
  );
});

export default PuzzleTable;
