import { assert } from "chai";
import type { PuzzleType } from "../../../../imports/lib/models/Puzzles";
import type { TagType } from "../../../../imports/lib/models/Tags";
import {
  filteredPuzzleGroups,
  puzzleGroupsByRelevance,
  puzzleInterestingness,
} from "../../../../imports/lib/puzzle-sort-and-group";

const hunt = "hunt_id";
const allTags: TagType[] = [];
const allTagsById: Map<string, TagType> = new Map(); // index by _id -- wanted by implementation
const allTagsByName: Map<string, TagType> = new Map(); // index by name, wanted for test readability
const stubUserId = "user";

function makeTag(name: string): TagType {
  const _id = `tag_${name}`;
  const tag = {
    _id,
    name,
    hunt,
    deleted: false,
    createdBy: stubUserId,
    // guarantee consistent + unique tag creation timestamps in the order of creation
    createdAt: new Date(1000 + allTags.length),
    updatedBy: undefined,
    updatedAt: new Date(1000 + allTags.length),
  };
  allTags.push(tag);
  allTagsById.set(_id, tag);
  allTagsByName.set(name, tag);
  return tag;
}

let puzCounter = 0;

type MakePuzzleOpts = {
  answers?: string[];
  expectedAnswerCount?: number;
};

function makePuzzle(
  title: string,
  tags: string[],
  opts: MakePuzzleOpts = {},
): PuzzleType {
  const { answers = [], expectedAnswerCount = 1 } = opts;
  const tagIds = tags
    .map((tagName) => {
      if (allTagsByName.has(tagName)) {
        return allTagsByName.get(tagName)!;
      } else {
        return makeTag(tagName);
      }
    })
    .map((tag) => tag._id);

  const _id = `puz_${puzCounter}`;
  const puzzle = {
    _id,
    hunt,
    tags: tagIds,
    title,
    answers,
    expectedAnswerCount,
    url: "http://example.com",
    deleted: false,
    createdBy: stubUserId,
    createdAt: new Date(2000 + puzCounter),
    updatedBy: undefined,
    updatedAt: new Date(2000 + puzCounter),
    replacedBy: undefined,
  };
  puzCounter += 1;
  return puzzle;
}

describe("puzzleInterestingness", function () {
  const topLevelAdminPuz = makePuzzle("Administrivia", ["administrivia"]);
  assert.equal(
    puzzleInterestingness(topLevelAdminPuz, allTagsById, undefined),
    -5,
  );

  const adminInGroupPuz = makePuzzle("Administrivia", [
    "administrivia",
    "group:test-group",
  ]);
  assert.equal(
    puzzleInterestingness(adminInGroupPuz, allTagsById, undefined),
    -4,
  );

  const metaPuz = makePuzzle("Meta", [
    "meta-for:test-group",
    "group:test-group",
  ]);
  assert.equal(puzzleInterestingness(metaPuz, allTagsById, "test-group"), -3);
  assert.equal(puzzleInterestingness(metaPuz, allTagsById, "other-group"), -1);

  const metametaPuz = makePuzzle("Metameta", ["is:metameta"]);
  assert.equal(
    puzzleInterestingness(metametaPuz, allTagsById, "test-group"),
    -2,
  );

  const regularPuz = makePuzzle("Regular", []);
  assert.equal(puzzleInterestingness(regularPuz, allTagsById, "test-group"), 0);
});

describe("puzzleGroupsByRelevance", function () {
  describe("grouping", function () {
    it("does not nest identical groups", function () {
      // If there are two groups which have exactly the same set of puzzles, we
      // cannot tell which is the 'outer' or 'inner' group, so we show both
      // groups in full.
      const puzA = makePuzzle("A", ["group:a", "group:b"]);
      const puzB = makePuzzle("B", ["group:a", "group:b"]);
      const groups = puzzleGroupsByRelevance([puzA, puzB], allTags);
      assert.deepEqual(groups, [
        {
          sharedTag: allTagsByName.get("group:a"),
          puzzles: [puzA, puzB],
          subgroups: [],
        },
        {
          sharedTag: allTagsByName.get("group:b"),
          puzzles: [puzA, puzB],
          subgroups: [],
        },
      ]);
    });

    it("handles deep hierarchy", function () {
      // We can nest deeply.
      const puzA = makePuzzle("A", ["group:all"]);
      const puzB = makePuzzle("B", ["group:all", "group:a"]);
      const puzC = makePuzzle("C", ["group:all", "group:a", "group:b"]);
      const puzD = makePuzzle("D", [
        "group:all",
        "group:a",
        "group:b",
        "group:c",
      ]);
      const allPuz = [puzA, puzB, puzC, puzD];
      const groups = puzzleGroupsByRelevance(allPuz, allTags);
      assert.deepEqual(groups, [
        {
          sharedTag: allTagsByName.get("group:all"),
          puzzles: [puzA],
          subgroups: [
            {
              sharedTag: allTagsByName.get("group:a"),
              puzzles: [puzB],
              subgroups: [
                {
                  sharedTag: allTagsByName.get("group:b"),
                  puzzles: [puzC],
                  subgroups: [
                    {
                      sharedTag: allTagsByName.get("group:c"),
                      puzzles: [puzD],
                      subgroups: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    it("shows common subgroups in each parent", function () {
      // If a group is a strict subset of several other disjoint groups, we'll
      // show it in each.
      const puzA = makePuzzle("A", ["group:a"]);
      const puzB = makePuzzle("B", ["group:b"]);
      const puzInner = makePuzzle("Shared", [
        "group:a",
        "group:b",
        "group:inner",
      ]);
      const groups = puzzleGroupsByRelevance([puzA, puzB, puzInner], allTags);
      assert.deepEqual(groups, [
        {
          sharedTag: allTagsByName.get("group:a"),
          puzzles: [puzA],
          subgroups: [
            {
              sharedTag: allTagsByName.get("group:inner"),
              puzzles: [puzInner],
              subgroups: [],
            },
          ],
        },
        {
          sharedTag: allTagsByName.get("group:b"),
          puzzles: [puzB],
          subgroups: [
            {
              sharedTag: allTagsByName.get("group:inner"),
              puzzles: [puzInner],
              subgroups: [],
            },
          ],
        },
      ]);
    });
  });

  describe("sorting", function () {
    it("sorts as expected", function () {
      // -3 administrivia always floats to the top
      // -2 Group with unsolved puzzle with matching meta-for:<this group>
      // -1 Group with some other unsolved is:meta puzzle
      //  0 Groups with no metas yet and at least one unsolved puzzle
      //  1 Ungrouped puzzles
      //  2 Groups with at least one matching meta-for:<this group>
      //    with all matching meta-for:<this group> puzzles solved
      //  3 Groups with no unsolved puzzles

      // group with only solved puzzles (3)
      const allSolvedRound = makePuzzle(
        "Solved puzzle in fully-solved group",
        ["group:fully-solved"],
        { answers: ["RIGHTANSWER"] },
      );
      const allSolvedMeta = makePuzzle(
        "Solved metapuzzle in fully-solved group",
        ["meta-for:fully-solved", "group:fully-solved"],
        { answers: ["METAANSWER"] },
      );

      // group with only solved puzzles, despite having no metapuzzle (also 3)
      const flatFullySolved = makePuzzle(
        "Solved puzzle in flat-fully-solved group",
        ["group:flat-fully-solved"],
        { answers: ["FLATLAND"] },
      );

      // Group with solved meta for the group, but at least one unsolved puzzle (2)
      const metasSolvedMeta1 = makePuzzle(
        "Solved metapuzzle 1 in metas-solved group",
        ["meta-for:metas-solved", "group:metas-solved"],
        { answers: ["ANSWERONE"] },
      );
      const metasSolvedMeta2 = makePuzzle(
        "Solved metapuzzle 2 in metas-solved group",
        ["meta-for:metas-solved", "group:metas-solved"],
        { answers: ["ANSWERTWO"] },
      );
      const metasSolvedRoundUnsolvedPuzzle = makePuzzle(
        "Unsolved round puzzle in metas-solved group",
        ["group:metas-solved"],
      );

      // ungrouped puzzles (1)
      const ungrouped1 = makePuzzle("Ungrouped puzzle 1", []);
      const ungrouped2 = makePuzzle("Ungrouped puzzle 2", []);

      // Groups with no metas yet and at least one unsolved puzzle (0)
      const flatPuzzle1 = makePuzzle("unsolved puzzle in group with no metas", [
        "group:no-metas",
      ]);
      const flatPuzzle2 = makePuzzle(
        "solved puzzle in group with no metas",
        ["group:no-metas"],
        { answers: ["TRIGONOMETRY"] },
      );

      // Group with some other unsolved meta puzzle, but not the one that the group is for (-1)
      const otherUnsolvedUnsolvedMeta = makePuzzle(
        "Unsolved metapuzzle, but the group's meta is solved",
        ["meta-for:some-other-group", "group:other-unsolved-meta"],
      );
      const otherUnsolvedSolvedMeta = makePuzzle(
        "Solved metapuzzle for group",
        ["meta-for:other-unsolved-meta", "group:other-unsolved-meta"],
        { answers: ["SOLVENT"] },
      );

      // Group with an unsolved puzzle with matching meta-for: that group, even
      // if there's another puzzle with matching meta-for: that group that
      // is solved (-2)
      const unsolvedRelatedMeta = makePuzzle(
        "Unsolved meta in partly-solved group",
        ["meta-for:partly-solved", "group:partly-solved"],
      );
      const solvedRelatedMeta = makePuzzle(
        "Solved meta in partly-solved group",
        ["meta-for:partly-solved", "group:partly-solved"],
        { answers: ["SOLUTION"] },
      );
      const solvedRelatedPuzzle = makePuzzle(
        "Solved nonmeta in partly-solved group",
        ["group:partly-solved"],
        { answers: ["BENOISY"] },
      );

      // administrivia (-3)
      const admPuzzle = makePuzzle("Administrivia", ["administrivia"], {
        expectedAnswerCount: 0,
      });

      // Given in ~reverse order of expected result groups, to verify that
      // sorting actually reorders them
      const puzzles = [
        allSolvedRound,
        allSolvedMeta,
        flatFullySolved,
        metasSolvedMeta1,
        metasSolvedMeta2,
        metasSolvedRoundUnsolvedPuzzle,
        ungrouped1,
        ungrouped2,
        flatPuzzle1,
        flatPuzzle2,
        otherUnsolvedUnsolvedMeta,
        otherUnsolvedSolvedMeta,
        unsolvedRelatedMeta,
        solvedRelatedMeta,
        solvedRelatedPuzzle,
        admPuzzle,
      ];

      const groups = puzzleGroupsByRelevance(puzzles, allTags);
      assert.deepEqual(groups, [
        {
          // Administrivia
          sharedTag: allTagsByName.get("administrivia"),
          puzzles: [admPuzzle],
          subgroups: [],
        },
        {
          // Group with an unsolved puzzle with matching meta-for: that group, even
          // though there's another puzzle with matching meta-for: that group that
          // is solved (-2)
          sharedTag: allTagsByName.get("group:partly-solved"),
          puzzles: [
            unsolvedRelatedMeta,
            solvedRelatedMeta,
            solvedRelatedPuzzle,
          ],
          subgroups: [],
        },
        {
          // Group with some other unsolved meta puzzle, but not the one that the group is for
          sharedTag: allTagsByName.get("group:other-unsolved-meta"),
          puzzles: [otherUnsolvedUnsolvedMeta, otherUnsolvedSolvedMeta],
          subgroups: [],
        },
        {
          // Group with no metas yet and at least one unsolved puzzle
          sharedTag: allTagsByName.get("group:no-metas"),
          puzzles: [flatPuzzle1, flatPuzzle2],
          subgroups: [],
        },
        {
          // ungrouped puzzles
          sharedTag: undefined,
          puzzles: [ungrouped1, ungrouped2],
          subgroups: [],
        },
        {
          // Group with solved meta for the group, but at least one unsolved puzzle (2)
          sharedTag: allTagsByName.get("group:metas-solved"),
          puzzles: [
            metasSolvedMeta1,
            metasSolvedMeta2,
            metasSolvedRoundUnsolvedPuzzle,
          ],
          subgroups: [],
        },
        {
          // group with only solved puzzles
          sharedTag: allTagsByName.get("group:fully-solved"),
          // Note: we preserve the given puzzle order from `allPuzzles` here.
          // Puzzle ordering within a group is deferred until rendering time, where
          // it will sort by puzzleInterestingness.  As a result, this round puzzle
          // precedes the meta in this list.
          puzzles: [allSolvedRound, allSolvedMeta],
          subgroups: [],
        },
        {
          // group with only solved puzzles, despite having no metapuzzle (also 3)
          sharedTag: allTagsByName.get("group:flat-fully-solved"),
          puzzles: [flatFullySolved],
          subgroups: [],
        },
      ]);
    });
  });
});

describe("filteredPuzzleGroups", function () {
  it("removes empty groups", function () {
    const puzA = makePuzzle("A", ["group:a"]);
    const puzB = makePuzzle("B", ["group:b"]);
    const groups = puzzleGroupsByRelevance([puzA, puzB], allTags);
    const filtered = filteredPuzzleGroups(groups, new Set([puzA._id]));
    assert.deepEqual(filtered, [
      {
        sharedTag: allTagsByName.get("group:a"),
        puzzles: [puzA],
        subgroups: [],
      },
    ]);
  });

  it("preserves intermediate group structure when filtering", function () {
    const puzA = makePuzzle("A", ["group:outer"]);
    const puzB = makePuzzle("B", ["group:outer", "group:inner"]);
    const groups = puzzleGroupsByRelevance([puzA, puzB], allTags);
    const filtered = filteredPuzzleGroups(groups, new Set([puzB._id]));
    assert.deepEqual(filtered, [
      {
        sharedTag: allTagsByName.get("group:outer"),
        puzzles: [],
        subgroups: [
          {
            sharedTag: allTagsByName.get("group:inner"),
            puzzles: [puzB],
            subgroups: [],
          },
        ],
      },
    ]);
  });
});
