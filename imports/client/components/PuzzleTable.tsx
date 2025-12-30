import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import type { SolvednessState, Theme } from "../theme";
import PuzzleAnswer from "./PuzzleAnswer";
import Breakable from "./styling/Breakable";
import { backgroundColorLookupTable } from "./styling/constants";

const PuzzleTableEl = styled.table`
  width: 100%;
  max-width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;
`;

const PuzzleTableTr = styled.tr<{
  $solvedness: Solvedness;
  theme: Theme;
}>`
  background-color: ${({ $solvedness, theme }) => {
    const solved = $solvedness as SolvednessState;
    return theme.colors.solvedness[solved];
  }};
`;

// It's difficult to make table cells overflow. Setting a max-width in vw works pretty well, with
// few compromises. 43vw was chosen to work on the narrowest mobile devices.
const PuzzleTableCell = styled.td`
  padding: 0 4px;
  vertical-align: baseline;
  overflow: hidden;
  max-width: 43vw;
`;

const PuzzleTableRow = ({
  puzzle,
  segmentAnswers,
}: {
  puzzle: PuzzleType;
  segmentAnswers?: boolean;
}) => {
  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
  const answers = puzzle.answers.map((answer, i) => {
    return (
      <PuzzleAnswer
        key={`${i}-${answer}`}
        answer={answer}
        respace={segmentAnswers}
        breakable={!segmentAnswers}
        indented={!segmentAnswers}
      />
    );
  });

  const solvedness = computeSolvedness(puzzle);

  return (
    <PuzzleTableTr $solvedness={solvedness}>
      <PuzzleTableCell>
        <Breakable>
          <Link to={linkTarget}>{puzzle.title}</Link>
        </Breakable>
      </PuzzleTableCell>
      <PuzzleTableCell>{answers}</PuzzleTableCell>
    </PuzzleTableTr>
  );
};

const PuzzleTable = React.memo(
  ({
    puzzles,
    segmentAnswers,
  }: {
    puzzles: PuzzleType[];
    segmentAnswers?: boolean;
  }) => {
    const tableRows = puzzles.map((puzzle) => {
      return (
        <PuzzleTableRow
          key={puzzle._id}
          puzzle={puzzle}
          segmentAnswers={segmentAnswers}
        />
      );
    });

    return (
      <PuzzleTableEl>
        <tbody>{tableRows}</tbody>
      </PuzzleTableEl>
    );
  },
);

export default PuzzleTable;
