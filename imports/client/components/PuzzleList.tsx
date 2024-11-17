import React from "react";
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
  }: {
    // The puzzles to show in this list
    puzzles: PuzzleType[];
    bookmarked: Set<string>;
    // All tags for this hunt, including those not used by any puzzles
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: boolean;
    suppressTags?: string[];
    segmentAnswers?: boolean;
  }) => {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    return (
      <div className="puzzle-list">
        {puzzles.map((puzzle) => {
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
            />
          );
        })}
      </div>
    );
  },
);

export default PuzzleList;
