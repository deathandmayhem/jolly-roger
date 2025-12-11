import { indexedById } from "./listUtils";
import type { PuzzleType } from "./models/Puzzles";
import type { TagType } from "./models/Tags";
import { computeSolvedness } from "./solvedness";

interface PuzzleGroup {
  sharedTag?: TagType;
  puzzles: PuzzleType[];
  subgroups: PuzzleGroup[];
}

// Used with interior mutability for preparing `PuzzleGroup`s suitable for
// returning to users.
interface InternalPuzzleGroup {
  sharedTag?: TagType;
  puzzles: PuzzleType[];
  subgroups: InternalPuzzleGroup[];
  puzzleIdCache: Set<string>;
  interestingness: number;
}

function puzzleInterestingness(
  puzzle: PuzzleType,
  indexedTags: Map<string, TagType>,
  group: string | undefined,
): number {
  // If the shared tag for this group is group:<something>, then group will equal '<something>', and
  // we wish to sort a puzzle named 'meta-for:<something>' at the top.
  let desiredTagName: string | undefined;
  if (group) {
    desiredTagName = `meta-for:${group}`;
  }
  let isAdministrivia = false;
  let isGroup = false;
  let minScore = 0;

  puzzle.tags.forEach((tagId) => {
    const tag = indexedTags.get(tagId);

    if (tag) {
      // Sometimes tag IDs load on puzzles before the Tag documents make it to the client.  In this
      // case, tag will wind up undefined.  It'll get fixed on rerender as soon as the tag object
      // loads, so just pretend that tag doesn't exist if the join from id -> Tag object here
      // comes back undefined.

      if (tag.name.lastIndexOf("group:", 0) === 0) {
        isGroup = true;
      }

      if (tag.name === "administrivia") {
        // First comes any administrivia
        minScore = Math.min(-4, minScore);
        isAdministrivia = true;
      } else if (desiredTagName && tag.name === desiredTagName) {
        // Matching meta gets sorted top.
        minScore = Math.min(-3, minScore);
      } else if (tag.name === "is:metameta") {
        // Metameta sorts above meta.
        minScore = Math.min(-2, minScore);
      } else if (
        tag.name === "is:meta" ||
        tag.name.lastIndexOf("meta-for:", 0) === 0
      ) {
        // Meta sorts above non-meta.
        minScore = Math.min(-1, minScore);
      }
    }
  });
  // Sort general administrivia above administrivia with a group
  if (isAdministrivia && !isGroup) {
    minScore = Math.min(-5, minScore);
  }

  return minScore;
}

function interestingnessOfGroup(
  puzzles: PuzzleType[],
  sharedTag: TagType | undefined,
  indexedTags: Map<string, TagType>,
) {
  // Rough idea: sort, from top to bottom:
  // -3 administrivia always floats to the top
  // -2 Group with unsolved puzzle with matching meta-for:<this group>
  // -1 Group with some other unsolved is:meta or meta-for:*  puzzle
  //  0 Groups with no metas yet and at least one unsolved puzzle
  //  1 Ungrouped puzzles
  //  2 Groups with at least one matching meta-for:<this group> with all
  //    matching meta-for:<this group> puzzles solved
  //  3 Groups with no unsolved puzzles

  // ungrouped puzzles go after groups, esp. after groups with a known unsolved meta.
  // Guarantees that if ia === ib, then sharedTag exists.
  if (!sharedTag) return 1;

  if (sharedTag.name === "administrivia") {
    return -3;
  }

  // Look for a puzzle with meta-for:(this group's shared tag)
  let metaForTag: string | undefined;
  if (sharedTag && sharedTag.name.lastIndexOf("group:", 0) === 0) {
    metaForTag = `meta-for:${sharedTag.name.slice("group:".length)}`;
  }

  let hasSolvedMetaForSharedGroup = false;
  let hasUnsolvedMetaForSharedGroup = false;
  let hasUnsolvedOtherMeta = false;
  let hasUnsolvedPuzzles = false;
  puzzles.forEach((puzzle) => {
    const solvedness = computeSolvedness(puzzle);
    if (solvedness === "unsolved") {
      hasUnsolvedPuzzles = true;
    }
    puzzle.tags.forEach((tagId) => {
      const tag = indexedTags.get(tagId);

      if (tag) {
        // tag may be undefined if we get tag IDs before the new Tag arrives from the server;
        // ignore such tags for sorting purposes

        if (metaForTag && tag.name === metaForTag) {
          // This puzzle is meta-for: the group.
          if (solvedness === "solved") {
            hasSolvedMetaForSharedGroup = true;
          } else {
            hasUnsolvedMetaForSharedGroup = true;
          }
        } else if (
          (tag.name === "is:meta" ||
            tag.name.lastIndexOf("meta-for:", 0) === 0) &&
          solvedness === "unsolved"
        ) {
          hasUnsolvedOtherMeta = true;
        }
      }
    });
  });

  if (!hasUnsolvedPuzzles) return 3;
  if (hasUnsolvedMetaForSharedGroup) return -2;
  if (hasUnsolvedOtherMeta) return -1;
  if (hasSolvedMetaForSharedGroup) return 2;
  return 0;
}

function compareGroups(a: InternalPuzzleGroup, b: InternalPuzzleGroup): number {
  // Sort groups by interestingness.
  const ia = a.interestingness;
  const ib = b.interestingness;
  if (ia !== ib) return ia - ib;
  // Within an interestingness class, sort tags by creation date, which should
  // roughly match hunt order.
  return a.sharedTag!.createdAt.getTime() - b.sharedTag!.createdAt.getTime();
}

function sortGroups(groups: InternalPuzzleGroup[]) {
  groups.forEach((group) => {
    sortGroups(group.subgroups);
  });
  groups.sort((a, b) => compareGroups(a, b));
}

function isStrictSubgroup(
  subCand: InternalPuzzleGroup,
  parentCand: InternalPuzzleGroup,
) {
  // A child group is considered a strict subgroup of a parent group if
  // * the parent contains every puzzle in the child, and
  // * the parent also contains at least one puzzle that the child does not contain.

  // At the point we're calling this, we ignore the `subgroups` field, which are not yet
  // populated, and consider only puzzles for determining subgroupiness.

  if (subCand.puzzles.length >= parentCand.puzzles.length) {
    // If the subgroup is the same size as or larger than the parent candidate,
    // it can't be contained by the parent candidate group (second criterion above)
    return false;
  }

  // first criterion: does every puzzle id in subCand appear in parentCand?
  const parentIds = parentCand.puzzleIdCache;
  return subCand.puzzles.every((p) => {
    return parentIds.has(p._id);
  });
}

function dedupedGroup(g: InternalPuzzleGroup): PuzzleGroup {
  const childMembers = new Set();
  g.subgroups.forEach((subgroup) => {
    subgroup.puzzleIdCache.forEach((id) => {
      childMembers.add(id);
    });
  });
  const dedupedSubgroups = g.subgroups.map((subgroup) =>
    dedupedGroup(subgroup),
  );
  const dedupedPuzzles = g.puzzles.filter((puzzle) => {
    return !childMembers.has(puzzle._id);
  });

  return {
    sharedTag: g.sharedTag,
    puzzles: dedupedPuzzles,
    subgroups: dedupedSubgroups,
  };
}

function filteredPuzzleGroup(
  group: PuzzleGroup,
  retainedPuzzleIds: Set<string>,
): PuzzleGroup | undefined {
  const retainedSubgroups = group.subgroups
    .map((subgroup) => {
      return filteredPuzzleGroup(subgroup, retainedPuzzleIds);
    })
    .filter((x) => x !== undefined);

  const retainedPuzzles = group.puzzles.filter((puzzle) => {
    return retainedPuzzleIds.has(puzzle._id);
  });

  // If there are no remaining child puzzles nor any nonempty subgroups, then
  // this group is empty, and we should drop it.
  if (retainedPuzzles.length === 0 && retainedSubgroups.length === 0) {
    return undefined;
  }

  // Otherwise, propagate what's left.
  return {
    sharedTag: group.sharedTag,
    puzzles: retainedPuzzles,
    subgroups: retainedSubgroups,
  };
}

function filteredPuzzleGroups(
  groups: PuzzleGroup[],
  retainedPuzzleIds: Set<string>,
): PuzzleGroup[] {
  return groups
    .map((group) => {
      return filteredPuzzleGroup(group, retainedPuzzleIds);
    })
    .filter((x) => x !== undefined);
}

function puzzleGroupsByRelevance(
  allPuzzles: PuzzleType[],
  allTags: TagType[],
): PuzzleGroup[] {
  // Maps tag id to list of puzzles holding that tag.
  const groupsMap: Map<string, PuzzleType[]> = new Map();
  // For collecting puzzles that are not included in any group.
  const ungroupedPuzzles: PuzzleType[] = [];
  const tagsByIndex = indexedById(allTags);
  allPuzzles.forEach((puzzle) => {
    let grouped = false;
    puzzle.tags.forEach((tagId) => {
      const tag = tagsByIndex.get(tagId);
      // On new puzzle creation, if a tag is new as well, we can receive the
      // new Puzzle object (and rerender) before the new Tag object streams
      // in, so it's possible that we don't have a tag object for a given ID,
      // and that tag here will be undefined.  Handle this case gracefully.
      if (
        tag?.name &&
        (tag.name === "administrivia" ||
          tag.name.lastIndexOf("group:", 0) === 0)
      ) {
        grouped = true;
        if (!groupsMap.has(tag._id)) {
          groupsMap.set(tag._id, []);
        }

        groupsMap.get(tag._id)!.push(puzzle);
      }
    });

    if (!grouped) {
      ungroupedPuzzles.push(puzzle);
    }
  });

  // Collect groups into a list.
  const groups: InternalPuzzleGroup[] = [...groupsMap.keys()].map((key) => {
    const puzzles = groupsMap.get(key)!;
    const sharedTag = tagsByIndex.get(key);
    const puzzleIdCache = new Set(puzzles.map((p) => p._id));
    const interestingness = interestingnessOfGroup(
      puzzles,
      sharedTag,
      tagsByIndex,
    );
    return {
      sharedTag,
      puzzles,
      subgroups: [],
      puzzleIdCache,
      interestingness,
    };
  });

  // For each group, from smallest to largest (by puzzle count), try to find
  // groups which contain it entirely and at least one other puzzle.  Nest
  // the smaller group under each such larger group, deduplicating shared
  // subgroups along the way, and remove it from the groups forest if adopted
  // by at least one other group.
  //
  // Once we've found all nestings, we'll remove from `puzzles` any puzzles
  // that are contained by an entry in `subgroups` (recursively).

  // Start by sorting groups by puzzle count, which will allow us to do this
  // nesting adoption in a single pass through the groups.
  groups.sort((a, b) => {
    return a.puzzles.length - b.puzzles.length;
  });

  let i = 0;
  while (i < groups.length) {
    const currentGroup = groups[i]!;
    const parentCandidates: number[] = [];

    // Collect parent candidate indices.  We only need to consider groups for
    // which the current group is a strict subgroup, since if two groups
    // contain exactly the same set of puzzles, it's not clear which should
    // contain the other, so we'll present both at the same level.
    for (let j = i + 1; j < groups.length; j++) {
      if (isStrictSubgroup(currentGroup, groups[j]!)) {
        parentCandidates.push(j);
      }
    }

    // If we have any groups that could contain this one, figure out which
    // ones we should make this group a direct child of.  An example:
    // If currentGroup is group A, and A is a strict subgroup of both group B and group C,
    // then group B might itself be a strict subgroup of group C (and we'll
    // later nest group B under group C, once we look for which groups should
    // adopt group B).
    if (parentCandidates.length > 0) {
      // For each new adopting parent:
      parentCandidates.forEach((k) => {
        const parentGroup = groups[k]!;
        // Insert that group as a child of that parent.
        parentGroup.subgroups.push(currentGroup);

        // Remove any direct subgroups of currentGroup from being direct
        // children of that parent, if present.  Inductively, this prevents
        // us from having duplicate child groups for strictly-contained subgroups.
        parentGroup.subgroups = parentGroup.subgroups.filter(
          (parentSubgroup) => {
            return currentGroup.subgroups.every((childSubgroup) => {
              // sharedTag is guaranteed to be set in each group
              return (
                parentSubgroup.sharedTag!._id !== childSubgroup.sharedTag!._id
              );
            });
          },
        );
      });

      // remove the current group from the group list; it now lives only as a
      // child of each parent candidate in filtered
      groups.splice(i, 1);

      // the splice just shortened the list by 1, leave i as it is
    } else {
      i += 1;
    }
  }

  // Add the ungrouped puzzles too, if there are any.
  if (ungroupedPuzzles.length > 0) {
    const ungroupedPuzzleIdCache = new Set(ungroupedPuzzles.map((p) => p._id));
    const interestingness = interestingnessOfGroup(
      ungroupedPuzzles,
      undefined,
      tagsByIndex,
    );
    groups.push({
      puzzles: ungroupedPuzzles,
      subgroups: [],
      puzzleIdCache: ungroupedPuzzleIdCache,
      interestingness,
    });
  }

  // Sort groups by interestingness.
  sortGroups(groups);

  // For each group, remove any members of puzzles that are also members of
  // any of their subgroups, so the puzzles will only be shown in the
  // wholly-contained subgroup.
  return groups.map((group) => dedupedGroup(group));
}

export {
  type PuzzleGroup,
  puzzleInterestingness,
  puzzleGroupsByRelevance,
  filteredPuzzleGroups,
};
