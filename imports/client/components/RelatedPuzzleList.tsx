import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React from "react";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import { sortPuzzlesByRelevanceWithinPuzzleGroup } from "../../lib/puzzle-sort-and-group";
import PuzzleList from "./PuzzleList";

const RelatedPuzzleList = React.memo(
  ({
    relatedPuzzles,
    bookmarked,
    allTags,
    canUpdate,
    sharedTag,
    suppressedTagIds,
    showSolvers,
    segmentAnswers,
    subscribers,
    puzzleUsers,
  }: {
    relatedPuzzles: PuzzleType[];
    bookmarked: Set<string>;
    allTags: TagType[];
    canUpdate: boolean;
    sharedTag: TagType | undefined;
    suppressedTagIds: string[];
    showSolvers: "viewers" | "hide" | "active";
    segmentAnswers?: boolean;
    subscribers: Record<string, Record<string, string[]>>;
    puzzleUsers: Record<string, string[]>;
  }) => {
    const isOffsite = useTracker(() => Meteor.user()?.isOffsite ?? false, []);
    // Sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.
    const tagIndex = indexedById(allTags);
    const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
      relatedPuzzles,
      sharedTag,
      tagIndex,
      isOffsite,
    );
    return (
      <PuzzleList
        puzzles={sortedPuzzles}
        bookmarked={bookmarked}
        allTags={allTags}
        canUpdate={canUpdate}
        suppressTags={suppressedTagIds}
        segmentAnswers={segmentAnswers}
        showSolvers={showSolvers}
        subscribers={subscribers}
        puzzleUsers={puzzleUsers}
      />
    );
  },
);

export default RelatedPuzzleList;
export { RelatedPuzzleList };
