import type { GuessType } from "../lib/models/Guesses";
import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    guessId: string;
    state: GuessType["state"];
    additionalNotes?: string;
  },
  void
>("Guesses.methods.setState");
