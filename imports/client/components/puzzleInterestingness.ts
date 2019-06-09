import { PuzzleType } from 'imports/lib/schemas/puzzles';
import { TagType } from 'imports/lib/schemas/tags';

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

export default puzzleInterestingness;
