import z from "zod";
import { GuessStates } from "../lib/models/Guesses";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Guesses.methods.setState",
  z.tuple([
    z.strictObject({
      guessId: z.string(),
      state: GuessStates,
      additionalNotes: z.string().optional(),
    }),
  ]),
  z.void(),
);
