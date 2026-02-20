import { indexedBy, indexedById } from "./listUtils";
import type { PuzzleType } from "./models/Puzzles";
import type { TagType } from "./models/Tags";
import { computeSolvedness } from "./solvedness";

interface PuzzleGroup {
  sharedTags: TagType[];
  puzzles: PuzzleType[];
  subgroups: PuzzleGroup[];
}

// Used with interior mutability for preparing `PuzzleGroup`s suitable for
// returning to users.
interface InternalPuzzleGroup {
  sharedTags: TagType[];
  puzzles: PuzzleType[];
  subgroups: InternalPuzzleGroup[];
  puzzleIdCache: Set<string>;
  interestingness: number;
}

function puzzleInterestingness(
  puzzle: PuzzleType,
  indexedTags: Map<string, TagType>,
  groups: string[],
): number {
  // If the shared tag for this group is group:<something>, then group will equal '<something>', and
  // we wish to sort a puzzle named 'meta-for:<something>' at the top.
  const metaFors = groups.map((group) => `meta-for:${group}`);
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
      } else if (metaFors.includes(tag.name)) {
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
  sharedTags: TagType[],
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
  if (!sharedTags.length) return 1;

  if (sharedTags.some((tag) => tag.name === "administrivia")) {
    return -3;
  }

  // Look for a puzzle with meta-for:(this group's shared tag)
  const metaFors = sharedTags
    .filter((tag) => tag.name.startsWith("group:"))
    .map((tag) => `meta-for:${tag.name.slice("group:".length)}`);

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

        if (metaFors.includes(tag.name)) {
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
  if (!b.sharedTags.length) return -1;
  if (!a.sharedTags.length) return 1;
  return (
    a.sharedTags[0]!.createdAt.getTime() - b.sharedTags[0]!.createdAt.getTime()
  );
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
    sharedTags: g.sharedTags,
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
    sharedTags: group.sharedTags,
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
    const sharedTags = sharedTag ? [sharedTag] : [];
    const puzzleIdCache = new Set(puzzles.map((p) => p._id));
    const interestingness = interestingnessOfGroup(
      puzzles,
      sharedTags,
      tagsByIndex,
    );
    return {
      sharedTags,
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
              // sharedTags is guaranteed to be nonempty in each group
              return (
                parentSubgroup.sharedTags[0]!._id !==
                childSubgroup.sharedTags[0]!._id
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
      [],
      tagsByIndex,
    );
    groups.push({
      puzzles: ungroupedPuzzles,
      subgroups: [],
      puzzleIdCache: ungroupedPuzzleIdCache,
      interestingness,
      sharedTags: [],
    });
  }

  // Sort groups by interestingness.
  sortGroups(groups);

  // For each group, remove any members of puzzles that are also members of
  // any of their subgroups, so the puzzles will only be shown in the
  // wholly-contained subgroup.
  return groups.map((group) => dedupedGroup(group));
}

function sortPuzzlesByRelevanceWithinPuzzleGroup(
  puzzles: PuzzleType[],
  sharedTags: TagType[],
  indexedTags: Map<string, TagType>,
) {
  const groups = sharedTags
    .filter((tag) => tag.name.startsWith("group:"))
    .map((tag) => tag.name.slice("group:".length));
  const sortedPuzzles = puzzles.slice(0);
  sortedPuzzles.sort((a, b) => {
    const ia = puzzleInterestingness(a, indexedTags, groups);
    const ib = puzzleInterestingness(b, indexedTags, groups);
    if (ia !== ib) {
      return ia - ib;
    } else {
      // Sort puzzles by creation time otherwise.
      return +a.createdAt - +b.createdAt;
    }
  });
  return sortedPuzzles;
}

class Collocation<T> {
  data: Map<string, Map<string, Set<T>>>;

  constructor() {
    this.data = new Map<string, Map<string, Set<T>>>();
  }

  add(a: string, b: string, value: T) {
    this.get(a, b).add(value);
  }

  get(a: string, b?: string): Set<T> {
    if (b === undefined) {
      b = a;
    }
    if (b < a) {
      [a, b] = [b, a];
    }
    let cola = this.data.get(a);
    if (cola === undefined) {
      cola = new Map<string, Set<T>>();
      this.data.set(a, cola);
    }
    let items = cola.get(b);
    if (items === undefined) {
      items = new Set<T>();
      cola.set(b, items);
    }
    return items;
  }

  keys(): MapIterator<string> {
    return this.data.keys();
  }

  count(a: string, b?: string): number {
    if (b === undefined) {
      b = a;
    }
    if (b < a) {
      [a, b] = [b, a];
    }
    return this.data.get(a)?.get(b)?.size || 0;
  }
}

interface grouplet {
  tag: string;
  additionalTags: Set<string>;
  allPuzzles: Set<string>;
  rootPuzzles: Set<string>;
  subgroups: grouplet[];
}

class Grouper {
  tagsByID: Map<string, TagType>;
  tagsByName: Map<string, TagType>;
  puzzlesByID: Map<string, PuzzleType>;
  nest: boolean;
  merge: boolean;
  makeNones: boolean;

  constructor(
    allPuzzles: PuzzleType[],
    allTags: TagType[],
    nest: boolean = true,
    merge: boolean = true,
    makeNones: boolean = true,
  ) {
    this.tagsByID = indexedBy(allTags, "_id");
    this.puzzlesByID = indexedBy(allPuzzles, "_id");
    this.tagsByName = indexedBy(allTags, "name", true);
    this.nest = nest;
    this.merge = merge;
    this.makeNones = makeNones;
  }

  toGroup(g: grouplet): InternalPuzzleGroup {
    const puzzles = Array.from(g.rootPuzzles).map(
      (id) => this.puzzlesByID.get(id)!,
    );
    const sharedTags = [g.tag, ...g.additionalTags].map(
      (tag) => this.tagsByID.get(tag)!,
    );
    return {
      puzzles: puzzles,
      subgroups: g.subgroups.map((subg) => this.toGroup(subg)),
      sharedTags: sharedTags,
      puzzleIdCache: g.rootPuzzles,
      interestingness: interestingnessOfGroup(
        puzzles,
        sharedTags,
        this.tagsByID,
      ),
    };
  }

  groupPuzzlesByTag(
    puzzles: PuzzleType[],
    tagName: string,
  ): [InternalPuzzleGroup[], PuzzleType[]] {
    // sparse collocation matrix tracks which tags overlap with other tags
    const colloc = new Collocation<string>();
    const ungroupedPuzzles: PuzzleType[] = [];
    // Build the collocation matrix
    puzzles.forEach((puzzle) => {
      const groups: string[] = [];
      puzzle.tags.forEach((tagID) => {
        const tag = this.tagsByID.get(tagID);
        let groupID: string = "";
        if (tag?.name.startsWith(`${tagName}:`)) {
          groupID = tagID;
        } else if (tag?.name.startsWith(`meta-for:${tagName}`)) {
          const baseTag = this.tagsByName.get(tag.name.slice(9));
          groupID = baseTag?._id || "";
        }
        if (groupID !== "" && groups.indexOf(groupID) === -1) {
          groups.push(groupID);
        }
      });
      if (groups.length === 0) {
        ungroupedPuzzles.push(puzzle);
      } else {
        groups.forEach((tag1, index) => {
          groups.slice(index).forEach((tag2) => {
            colloc.add(tag1, tag2, puzzle._id);
          });
        });
      }
    });

    const grouplets: grouplet[] = [
      ...colloc.keys().map((tag) => ({
        tag: tag,
        additionalTags: new Set<string>(),
        allPuzzles: colloc.get(tag),
        rootPuzzles: new Set<string>(colloc.get(tag)),
        subgroups: [],
      })),
    ];

    const groups: InternalPuzzleGroup[] = [];
    if (this.nest) {
      // Sort grouplets by size
      grouplets.sort((a, b) => a.allPuzzles.size - b.allPuzzles.size);
      grouplets.forEach((first, i) => {
        const size = colloc.count(first.tag);
        let topLevel = true;
        for (let j = i + 1; j < grouplets.length; j++) {
          const second = grouplets[j]!;
          const overlap = colloc.count(first.tag, second.tag);
          if (overlap === size) {
            // if the count of puzzles with both tags equals the count of puzzles with the first tag, then first is a subset of second
            if (overlap === colloc.count(second.tag)) {
              if (this.merge) {
                // they're the same group - just discard this one and attach its tag to the second.
                second.additionalTags.add(first.tag);
                second.additionalTags = second.additionalTags.union(
                  first.additionalTags,
                );
                topLevel = false;
              }
              // if we're not merging, keep identical groups as repeated siblings.
              continue;
            }
            // it's a strict subgroup -> make first a child of second
            topLevel = false;
            second.subgroups.push(first);
            second.rootPuzzles = second.rootPuzzles.difference(
              first.allPuzzles,
            );
            second.subgroups = second.subgroups.filter(
              (sg) => !first.subgroups.includes(sg),
            );
          }
        }
        if (topLevel) {
          // no group was a supergroup of this one -> build the proper group and add it to our return list
          groups.push(this.toGroup(first));
        }
      });
    } else {
      groups.push(...grouplets.map((g) => this.toGroup(g)));
    }
    if (this.makeNones && ungroupedPuzzles) {
      groups.push({
        puzzles: ungroupedPuzzles,
        sharedTags: [
          {
            _id: `fake-tag-no-${tagName}`,
            name: `${tagName}:None`,
            createdAt: new Date(),
            createdBy: "nobody",
            deleted: false,
            hunt: "",
            updatedAt: new Date(),
          },
        ],
        interestingness: 1,
        subgroups: [],
        puzzleIdCache: new Set<string>(),
      });
      return [groups, []];
    }

    return [groups, ungroupedPuzzles];
  }

  applyGrouping(parentGroup: InternalPuzzleGroup, tagName: string) {
    parentGroup.subgroups.forEach((group) => {
      this.applyGrouping(group, tagName);
    });
    const [newGroups, ungroupedPuzzles] = this.groupPuzzlesByTag(
      parentGroup.puzzles,
      tagName,
    );
    parentGroup.subgroups.push(...newGroups);
    parentGroup.puzzles = ungroupedPuzzles;
    if (
      this.merge &&
      parentGroup.puzzles.length === 0 &&
      parentGroup.subgroups.length === 1
    ) {
      const child = parentGroup.subgroups[0]!;
      parentGroup.sharedTags.push(...child.sharedTags);
      parentGroup.puzzles = child.puzzles;
      parentGroup.subgroups = child.subgroups;
      parentGroup.interestingness = child.interestingness;
      parentGroup.puzzleIdCache = child.puzzleIdCache;
    }
  }
}

function unwrapInternalGroup(g: InternalPuzzleGroup): PuzzleGroup {
  return {
    puzzles: g.puzzles,
    sharedTags: g.sharedTags,
    subgroups: g.subgroups.map(unwrapInternalGroup),
  };
}

function groupPuzzlesByTags(
  allPuzzles: PuzzleType[],
  allTags: TagType[],
  groupBy: string[],
  nest: boolean = false,
  merge: boolean = true,
  makeNones: boolean = true,
): PuzzleGroup[] {
  const adminTag = allTags.filter((t) => t.name === "administrivia")[0];
  const adminID = adminTag?._id;
  const rootGroup: InternalPuzzleGroup = {
    puzzles: [],
    subgroups: [],
    sharedTags: [],
    interestingness: 0,
    puzzleIdCache: new Set(),
  };
  const adminPuzzles: PuzzleType[] = [];
  allPuzzles.forEach((puzzle) => {
    if (adminID && puzzle.tags.includes(adminID)) {
      // administrivia gets put in its own group and not mixed in with other groups.
      adminPuzzles.push(puzzle);
    } else {
      rootGroup.puzzles.push(puzzle);
    }
  });
  const grouper = new Grouper(allPuzzles, allTags, nest, merge, makeNones);
  for (const tagName of groupBy) {
    grouper.applyGrouping(rootGroup, tagName);
  }
  // add the admin puzzles, and put the ungrouped puzzles in their own group so it can be sorted properly.
  if (rootGroup.puzzles) {
    rootGroup.subgroups.push({
      puzzles: rootGroup.puzzles,
      subgroups: [],
      sharedTags: [],
      puzzleIdCache: new Set(),
      interestingness: 1,
    });
  }
  if (adminPuzzles) {
    rootGroup.subgroups.push({
      sharedTags: adminTag ? [adminTag] : [],
      puzzles: adminPuzzles,
      subgroups: [],
      interestingness: -3,
      puzzleIdCache: new Set(),
    });
  }

  sortGroups([rootGroup]);

  const rg2 = unwrapInternalGroup(rootGroup);
  return rg2.subgroups;
}

export {
  type PuzzleGroup,
  groupPuzzlesByTags,
  puzzleInterestingness,
  puzzleGroupsByRelevance,
  filteredPuzzleGroups,
  sortPuzzlesByRelevanceWithinPuzzleGroup,
};
