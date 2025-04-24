import type { GdriveMimeTypesType } from "../lib/GdriveMimeTypes";
import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { huntId: string; puzzleId: string; docType: GdriveMimeTypesType },
  void
>("Puzzle.methods.createPuzzleDocument");
