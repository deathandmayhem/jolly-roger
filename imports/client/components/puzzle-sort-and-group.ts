import { _ } from 'meteor/underscore';
import { PuzzleType } from 'imports/lib/schemas/puzzles';
import { TagType } from 'imports/lib/schemas/tags';

interface PuzzleGroup {
  sharedTag?: TagType;
  puzzles: PuzzleType[];
  subgroups: PuzzleGroup[];
}

function puzzleInterestingness(
  puzzle: PuzzleType,
  indexedTags: Record<string, TagType>,
  group: string
): number {
  // If the shared tag for this group is group:<something>, then group will equal '<something>', and
  // we wish to sort a puzzle named 'meta-for:<something>' at the top.
  let desiredTagName;
  if (group) {
    desiredTagName = `meta-for:${group}`;
  }
  let isAdministrivia = false;
  let isGroup = false;
  let minScore = 0;

  for (let i = 0; i < puzzle.tags.length; i++) {
    const tag = indexedTags[puzzle.tags[i]];

    if (tag) {
      // Sometimes tag IDs load on puzzles before the Tag documents make it to the client.  In this
      // case, tag will wind up undefined.  It'll get fixed on rerender as soon as the tag object
      // loads, so just pretend that tag doesn't exist if the join from id -> Tag object here
      // comes back undefined.

      if (tag.name.lastIndexOf('group:', 0) === 0) {
        isGroup = true;
      }

      if (tag.name === 'administrivia') {
        // First comes any administrivia
        minScore = Math.min(-4, minScore);
        isAdministrivia = true;
      } else if (desiredTagName && tag.name === desiredTagName) {
        // Matching meta gets sorted top.
        minScore = Math.min(-3, minScore);
      } else if (tag.name === 'is:metameta') {
        // Metameta sorts above meta.
        minScore = Math.min(-2, minScore);
      } else if (tag.name === 'is:meta') {
        // Meta sorts above non-meta.
        minScore = Math.min(-1, minScore);
      }
    }
  }
  // Sort general administrivia above administrivia with a group
  if (isAdministrivia && !isGroup) {
    minScore = Math.min(-5, minScore);
  }

  return minScore;
}

function interestingnessOfGroup(group: PuzzleGroup, indexedTags: Record<string, TagType>) {
  // Rough idea: sort, from top to bottom:
  // -3 administrivia always floats to the top
  // -2 Group with unsolved puzzle with matching meta-for:<this group>
  // -1 Group with some other unsolved is:meta puzzle
  //  0 Groups with no metas yet
  //  1 Ungrouped puzzles
  //  2 Groups with a solved puzzle with matching meta-for:<this group>
  const puzzles = group.puzzles;
  const sharedTag = group.sharedTag;

  // ungrouped puzzles go after groups, esp. after groups with a known unsolved meta.
  // Guarantees that if ia === ib, then sharedTag exists.
  if (!sharedTag) return 1;

  if (sharedTag.name === 'administrivia') {
    return -3;
  }

  // Look for a puzzle with meta-for:(this group's shared tag)
  let metaForTag;
  if (sharedTag && sharedTag.name.lastIndexOf('group:', 0) === 0) {
    metaForTag = `meta-for:${sharedTag.name.slice('group:'.length)}`;
  }

  let hasUnsolvedMeta = false;
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    for (let j = 0; j < puzzle.tags.length; j++) {
      const tag = indexedTags[puzzle.tags[j]];

      if (tag) {
        // tag may be undefined if we get tag IDs before the new Tag arrives from the server;
        // ignore such tags for sorting purposes

        if (metaForTag && tag.name === metaForTag) {
          // This puzzle is meta-for: the group.
          if (puzzle.answers.length >= puzzle.expectedAnswerCount) {
            return 2;
          } else {
            return -2;
          }
        } else if ((tag.name === 'is:meta' || tag.name.lastIndexOf('meta-for:', 0) === 0) && !(puzzle.answers.length >= puzzle.expectedAnswerCount)) {
          hasUnsolvedMeta = true;
        }
      }
    }
  }

  if (hasUnsolvedMeta) return -1;
  return 0;
}

function compareGroups(a: PuzzleGroup, b: PuzzleGroup, tagsByIndex: Record<string, TagType>) {
  // Sort groups by interestingness.
  const ia = interestingnessOfGroup(a, tagsByIndex);
  const ib = interestingnessOfGroup(b, tagsByIndex);
  if (ia !== ib) return ia - ib;
  // Within an interestingness class, sort tags by creation date, which should
  // roughly match hunt order.
  return a.sharedTag!.createdAt.getTime() - b.sharedTag!.createdAt.getTime();
}

function sortGroups(groups: PuzzleGroup[], tagsByIndex: Record<string, TagType>) {
  groups.forEach((group) => {
    sortGroups(group.subgroups, tagsByIndex);
  });
  groups.sort((a, b) => compareGroups(a, b, tagsByIndex));
}

function isStrictSubgroup(subCand: PuzzleGroup, parentCand: PuzzleGroup) {
  // At the point we're calling this, we ignore subGroups, which are not yet
  // populated, and consider only puzzles.
  const childIds = subCand.puzzles.map((p) => p._id);
  const parentIds = parentCand.puzzles.map((p) => p._id);
  const contained = _.intersection(parentIds, childIds);
  const parentOnly = _.difference(parentIds, childIds);
  // A group is a strict subgroup if the parent contains every puzzle in the
  // child, and also contains at least one puzzle that the child does not
  // contain.
  return contained.length === childIds.length && parentOnly.length > 0;
}

// Mutates g in place!
function dedupeGroup(g: PuzzleGroup): string[] {
  // Returns the list of puzzle ids which are recursively represented by this
  // group (either directly, or indirectly).

  const originalIds = g.puzzles.map((p) => p._id);
  const childMembers = _.uniq(g.subgroups.flatMap((subg) => dedupeGroup(subg)));

  childMembers.forEach((pId) => {
    const idx = g.puzzles.findIndex((p) => p._id === pId);
    if (idx !== -1) {
      g.puzzles.splice(idx, 1);
    }
  });

  return originalIds;
}

function filteredPuzzleGroup(
  group: PuzzleGroup,
  retainedPuzzleIds: Set<string>
): PuzzleGroup | undefined {
  const retainedSubgroups = group.subgroups.map((subgroup) => {
    return filteredPuzzleGroup(subgroup, retainedPuzzleIds);
  }).filter((x) => x !== undefined) as PuzzleGroup[];

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
  retainedPuzzleIds: Set<string>
): PuzzleGroup[] {
  return groups.map((group) => {
    return filteredPuzzleGroup(group, retainedPuzzleIds);
  }).filter((x) => x !== undefined) as PuzzleGroup[];
}

function puzzleGroupsByRelevance(allPuzzles: PuzzleType[], allTags: TagType[]): PuzzleGroup[] {
  // Maps tag id to list of puzzles holding that tag.
  const groupsMap: Record<string, PuzzleType[]> = {};
  // For collecting puzzles that are not included in any group.
  const ungroupedPuzzles = [];
  const tagsByIndex = _.indexBy(allTags, '_id');
  for (let i = 0; i < allPuzzles.length; i++) {
    const puzzle = allPuzzles[i];
    let grouped = false;
    for (let j = 0; j < puzzle.tags.length; j++) {
      const tag = tagsByIndex[puzzle.tags[j]];
      // On new puzzle creation, if a tag is new as well, we can receive the
      // new Puzzle object (and rerender) before the new Tag object streams
      // in, so it's possible that we don't have a tag object for a given ID,
      // and that tag here will be undefined.  Handle this case gracefully.
      if (tag && tag.name && (tag.name === 'administrivia' ||
          tag.name.lastIndexOf('group:', 0) === 0)) {
        grouped = true;
        if (!groupsMap[tag._id]) {
          groupsMap[tag._id] = [];
        }

        groupsMap[tag._id].push(puzzle);
      }
    }

    if (!grouped) {
      ungroupedPuzzles.push(puzzle);
    }
  }

  // Collect groups into a list.
  const groups: PuzzleGroup[] = Object.keys(groupsMap).map((key) => {
    const val = groupsMap[key];
    return {
      sharedTag: tagsByIndex[key],
      puzzles: val,
      subgroups: [],
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
    const currentGroup = groups[i];
    const parentCandidates: number[] = [];

    // Collect parent candidate indices.  We only need to consider groups for
    // which the current group is a strict subgroup, since if two groups
    // contain exactly the same set of puzzles, it's not clear which should
    // contain the other, so we'll present both at the same level.
    for (let j = i + 1; j < groups.length; j++) {
      if (isStrictSubgroup(currentGroup, groups[j])) {
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
        // Insert that group as a child of that parent.
        groups[k].subgroups.push(currentGroup);

        // Remove any direct subgroups of currentGroup from being direct
        // children of that parent, if present.  Inductively, this prevents
        // us from having duplicate child groups for strictly-contained subgroups.
        groups[k].subgroups = groups[k].subgroups.filter((parentSubgroup) => {
          return currentGroup.subgroups.every((childSubgroup) => {
            // sharedTag is guaranteed to be set in each group
            return parentSubgroup.sharedTag!._id !== childSubgroup.sharedTag!._id;
          });
        });
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
    groups.push({
      puzzles: ungroupedPuzzles,
      subgroups: [],
    });
  }

  // Sort groups by interestingness.
  sortGroups(groups, tagsByIndex);

  // For each group, remove any members of puzzles that are also members of
  // any of their subgroups, so the puzzles will only be shown in the
  // wholly-contained subgroup.
  groups.forEach((group) => {
    dedupeGroup(group);
  });

  return groups;
}

export {
  PuzzleGroup, puzzleInterestingness, puzzleGroupsByRelevance, filteredPuzzleGroups,
};
