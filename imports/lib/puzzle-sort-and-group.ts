import { indexedBy } from "./listUtils";
import type { PuzzleType } from "./models/Puzzles";
import type { TagType } from "./models/Tags";
import { computeSolvedness } from "./solvedness";

interface PuzzleGroup {
  sharedTags: TagType[];
  puzzles: PuzzleType[];
  subgroups: PuzzleGroup[];
  interestingness?: number;
}

function puzzleInterestingness(
  puzzle: PuzzleType,
  indexedTags: Map<string, TagType>,
  groups: string[],
): number {
  // If this group is identified by tag foo, we wish to sort a puzzle tagged 'meta-for:foo' to the top.
  const metaFors = groups.map((group) => `meta-for:${group}`);
  let minScore = 0;

  puzzle.tags.forEach((tagId) => {
    const tag = indexedTags.get(tagId);

    if (tag) {
      // Sometimes tag IDs load on puzzles before the Tag documents make it to the client.  In this
      // case, tag will wind up undefined.  It'll get fixed on rerender as soon as the tag object
      // loads, so just pretend that tag doesn't exist if the join from id -> Tag object here
      // comes back undefined.

      if (tag.name.startsWith("administrivia")) {
        // First comes any administrivia
        minScore = Math.min(-4, minScore);
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

function compareGroups(a: PuzzleGroup, b: PuzzleGroup): number {
  // Sort groups by interestingness.
  const ia = a.interestingness;
  const ib = b.interestingness;
  if (ia === undefined) return -1;
  if (ib === undefined) return 1;
  if (ia !== ib) return ia - ib;
  // Within an interestingness class, sort tags by creation date, which should
  // roughly match hunt order.
  if (!b.sharedTags.length) return -1;
  if (!a.sharedTags.length) return 1;
  return (
    a.sharedTags[0]!.createdAt.getTime() - b.sharedTags[0]!.createdAt.getTime()
  );
}

function sortGroups(groups: PuzzleGroup[]) {
  groups.forEach((group) => {
    sortGroups(group.subgroups);
  });
  groups.sort((a, b) => compareGroups(a, b));
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
    interestingness: group.interestingness,
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
  return groupPuzzlesByTags(allPuzzles, allTags, ["group"], true, false, false);
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

  toGroup(g: grouplet): PuzzleGroup {
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
  ): [PuzzleGroup[], PuzzleType[]] {
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
        } else if (tag?.name.startsWith(`administrivia-for:${tagName}`)) {
          const baseTag = this.tagsByName.get(
            tag.name.slice("administrivia-for:".length),
          );
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

    const groups: PuzzleGroup[] = [];
    if (this.nest || this.merge) {
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
            if (this.nest) {
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
        }
        if (topLevel) {
          // no group was a supergroup of this one -> build the proper group and add it to our return list
          groups.push(this.toGroup(first));
        }
      });
    } else {
      groups.push(...grouplets.map((g) => this.toGroup(g)));
    }
    if (this.makeNones && ungroupedPuzzles && groups.length) {
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
        interestingness: -2,
        subgroups: [],
      });
      return [groups, []];
    }

    return [groups, ungroupedPuzzles];
  }

  applyGrouping(parentGroup: PuzzleGroup, tagName: string) {
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
    }
  }
}

function groupPuzzlesByTags(
  allPuzzles: PuzzleType[],
  allTags: TagType[],
  groupBy: string[],
  nest: boolean = false,
  merge: boolean = true,
  makeNones: boolean = true,
): PuzzleGroup[] {
  // pull out administrivia first so they don't get folded into the other groups
  const adminTag = allTags.filter((t) => t.name === "administrivia")[0];
  const adminID = adminTag?._id;
  const rootGroup: PuzzleGroup = {
    puzzles: [],
    subgroups: [],
    sharedTags: [],
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
      interestingness: 1,
    });
  }
  if (adminPuzzles) {
    rootGroup.subgroups.push({
      sharedTags: adminTag ? [adminTag] : [],
      puzzles: adminPuzzles,
      subgroups: [],
      interestingness: -3,
    });
  }

  sortGroups([rootGroup]);

  return rootGroup.subgroups;
}

export {
  type PuzzleGroup,
  groupPuzzlesByTags,
  puzzleInterestingness,
  puzzleGroupsByRelevance,
  filteredPuzzleGroups,
  sortPuzzlesByRelevanceWithinPuzzleGroup,
};
