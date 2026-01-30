import { z } from "zod";
import { answer, foreignKey, nonEmptyString } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import { URL } from "../typedModel/regexes";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

const tagList = foreignKey.array().default([]).meta({ uniqueItems: true });

const Puzzle = withCommon(
  z.object({
    hunt: foreignKey,
    tags: tagList,
    title: nonEmptyString,
    url: z.string().regex(URL).optional(),
    answers: answer.array(),
    expectedAnswerCount: z.int32().nonnegative(),
    completedWithNoAnswer: z.boolean().optional(),
    replacedBy: foreignKey.optional(),
  }),
);

const Puzzles = new SoftDeletedModel("jr_puzzles", Puzzle);
Puzzles.addIndex({ deleted: 1, hunt: 1 });
Puzzles.addIndex({ url: 1 });
Puzzles.addIndex({ hunt: 1 });
export type PuzzleType = ModelType<typeof Puzzles>;

export default Puzzles;
