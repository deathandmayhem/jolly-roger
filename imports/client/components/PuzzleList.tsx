import React from "react";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Puzzle from "./Puzzle";

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
    // The puzzles to show in this list
    puzzles: PuzzleType[];
    bookmarked: Set<string>;
    // All tags for this hunt, including those not used by any puzzles
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: "viewers" | "hide" | "active";
    suppressTags?: string[];
    segmentAnswers?: boolean;
    subscribers?: Record<string, Record<string, string[]>>;
    pinnedMessages?: ChatMessageType[] | null;
    puzzleUsers: Record<string, string[]>;
  }) => {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    return (
      <div className="puzzle-list">
        {puzzles.map((puzzle) => {
          const puzzleId = puzzle._id;
          return (
            <Puzzle
              key={puzzle._id}
              puzzle={puzzle}
              bookmarked={bookmarked.has(puzzle._id)}
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
          );
        })}
      </div>
    );
  },
);

export default PuzzleList;
