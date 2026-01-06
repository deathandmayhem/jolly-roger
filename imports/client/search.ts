import type { GuessType } from "../lib/models/Guesses";
import type { PuzzleType } from "../lib/models/Puzzles";
import type { TagType } from "../lib/models/Tags";

// Given a set of tags and a set of search keys, produces a function that will
// evaluate whether a puzzle should be included for the given search filter.
function compilePuzzleMatcher(
  allTags: TagType[],
  searchKeys: string[],
): (p: PuzzleType) => boolean {
  const tagNames: Record<string, string> = {};
  allTags.forEach((t) => {
    tagNames[t._id] = t.name.toLowerCase();
  });
  const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
  return function (puzzle) {
    const titleWords = puzzle.title.toLowerCase().split(" ");
    return lowerSearchKeys.every((key) => {
      // Every key should match at least one of the following:
      // * prefix of word in title
      // * substring of any answer
      // * substring of any tag
      if (titleWords.some((word) => word.startsWith(key))) {
        return true;
      }

      if (
        puzzle.answers.some((answer) => {
          return answer.toLowerCase().includes(key);
        })
      ) {
        return true;
      }

      const tagMatch = puzzle.tags.some((tagId) => {
        const tagName = tagNames[tagId];
        return tagName?.includes(key);
      });

      if (tagMatch) {
        return true;
      }

      return false;
    });
  };
}

function compileGuessMatcher(
  puzzles: Map<string, PuzzleType>,
  displayNames: Map<string, string>,
  searchKeys: string[],
): (g: GuessType) => boolean {
  // Given a list a search keys, compileGuessMatcher returns a function that,
  // given a guess, returns true if all search keys match that guess in
  // some way, and false if any of the search keys cannot be found in
  // either the guess or the puzzle title.
  const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
  return (guess) => {
    const puzzle = puzzles.get(guess.puzzle)!;
    const guessText = guess.guess.toLowerCase();
    const submitterDisplayName = (
      displayNames.get(guess.createdBy) ?? ""
    ).toLowerCase();

    const titleWords = puzzle.title.toLowerCase().split(" ");
    // For each search key, if nothing from the text or the title match,
    // reject this guess.
    return lowerSearchKeys.every((key) => {
      return (
        guessText.includes(key) ||
        titleWords.some((word) => word.startsWith(key)) ||
        submitterDisplayName.includes(key)
      );
    });
  };
}

export { compilePuzzleMatcher, compileGuessMatcher };
