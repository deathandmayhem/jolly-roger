import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ huntId: string }>(
  "Guesses.publications.forGuessQueue",
);
