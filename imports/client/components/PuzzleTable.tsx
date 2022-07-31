import React from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { Solvedness, computeSolvedness } from '../../lib/solvedness';
import PuzzleAnswer from './PuzzleAnswer';
import { backgroundColorLookupTable } from './styling/constants';

const PuzzleTableEl = styled.table`
  width: 100%;
  max-width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;
`;

const PuzzleTableTr = styled.tr<{
  solvedness: Solvedness;
}>`
  ${({ solvedness }) => css`
    background-color: ${backgroundColorLookupTable[solvedness]};
  `}
`;

const PuzzleTableCell = styled.td`
  padding: 0 4px;
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

  const solvedness = computeSolvedness(puzzle);

  return (
    <PuzzleTableTr solvedness={solvedness}>
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
