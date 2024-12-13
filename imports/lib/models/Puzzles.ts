import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { answer, foreignKey, nonEmptyString } from "./customTypes";
import {
  attachCustomJsonSchema,
  schemaToJsonSchema,
} from "./generateJsonSchema";
import withCommon from "./withCommon";

const tagList = foreignKey.array().default([]);
attachCustomJsonSchema(tagList, {
  bsonType: "array",
  items: schemaToJsonSchema(foreignKey),
  uniqueItems: true,
});

const Puzzle = withCommon(
  z.object({
    hunt: foreignKey,
    tags: tagList,
    title: nonEmptyString,
    url: z.string().url().optional(),
    answers: answer.array(),
    expectedAnswerCount: z.number().int().min(-1),
    replacedBy: foreignKey.optional(),
  }),
);

const Puzzles = new SoftDeletedModel("jr_puzzles", Puzzle);
Puzzles.addIndex({ deleted: 1, hunt: 1 });
Puzzles.addIndex({ url: 1 });
export type PuzzleType = ModelType<typeof Puzzles>;

export default Puzzles;
