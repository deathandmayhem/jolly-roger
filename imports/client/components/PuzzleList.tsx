import React, { useContext } from "react";
import styled, { css } from "styled-components";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Puzzle from "./Puzzle";
import { PuzzleHoverContext } from "./PuzzleListPage";

const StyledPuzzleListDiv = styled.div`
  margin-bottom: 1em;
`;

const PuzzleWrapper = styled.div<{ $isHovered: boolean; $isMulti: boolean }>`
  transition:
    background-color 0.1s ease-in-out,
    box-shadow 0.1s ease-in-out,
    transform 0.1s ease-in-out;
  border-radius: 4px;
  border: 1px solid transparent; /* Reserve space for border */

  ${(props) =>
    props.$isHovered &&
    !props.$isMulti &&
    css`
      /* Standard Highlight for single items */
      background-color: ${({ theme }) => theme.colors.autocompleteBackground};
      box-shadow: 0 2px 4px ${({ theme }) => theme.colors.autocompleteShadow};
      border-color: ${({ theme }) => theme.colors.autocompleteShadow};
      position: relative;
      z-index: 1;
    `}

  ${(props) =>
    props.$isHovered &&
    props.$isMulti &&
    css`
      /* "Linked" Highlight for items appearing multiple times */
      background-color: ${({ theme }) => theme.colors.autocompleteBackground};
      box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.info}, 0 2px 8px ${({ theme }) => theme.colors.info};
      border-color: ${({ theme }) => theme.colors.info};
      position: relative;
      z-index: 2; /* Sit higher than single items */
    `}
`;

const PuzzleList = React.memo(
  ({
    puzzles,
    bookmarked,
    allTags,
    canUpdate,
    showSolvers,
    suppressTags,
    segmentAnswers,
    subscribers,
    pinnedMessages,
    puzzleUsers,
  }: {
    puzzles: PuzzleType[];
    bookmarked: Set<string>;
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: "viewers" | "hide" | "active";
    suppressTags?: string[];
    segmentAnswers?: boolean;
    subscribers?: Record<string, Record<string, string[]>>;
    pinnedMessages?: ChatMessageType[] | null;
    puzzleUsers: Record<string, string[]>;
  }) => {
    // Consume the expanded context
    const { hoveredPuzzleId, setHoveredPuzzleId, multiOccurrenceIds } =
      useContext(PuzzleHoverContext);

    return (
      <StyledPuzzleListDiv className="puzzle-list">
        {puzzles.map((puzzle) => {
          const puzzleId = puzzle._id;
          const isHovered = hoveredPuzzleId === puzzleId;
          const isMulti = multiOccurrenceIds.has(puzzleId);

          return (
            <PuzzleWrapper
              key={puzzleId}
              $isHovered={isHovered}
              $isMulti={isMulti}
              onMouseEnter={() => setHoveredPuzzleId(puzzleId)}
              onMouseLeave={() => setHoveredPuzzleId(null)}
            >
              <Puzzle
                puzzle={puzzle}
                bookmarked={bookmarked.has(puzzleId)}
                allTags={allTags}
                canUpdate={canUpdate}
                suppressTags={suppressTags}
                segmentAnswers={segmentAnswers}
                showSolvers={showSolvers}
                subscribers={
                  subscribers && puzzleId in subscribers
                    ? subscribers[puzzleId]
                    : null
                }
                puzzleUsers={
                  puzzleUsers && puzzleId in puzzleUsers
                    ? puzzleUsers[puzzleId]
                    : []
                }
              />
            </PuzzleWrapper>
          );
        })}
      </StyledPuzzleListDiv>
    );
  },
);

export default PuzzleList;
