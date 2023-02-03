import { z } from 'zod';
import { answer, foreignKey, nonEmptyString } from './customTypes';
import { attachCustomJsonSchema, schemaToJsonSchema } from './generateJsonSchema';
import withCommon from './withCommon';

const tagList = foreignKey.array().default([]);
attachCustomJsonSchema(tagList, {
  bsonType: 'array',
  items: schemaToJsonSchema(foreignKey),
  uniqueItems: true,
});

const Puzzle = withCommon(z.object({
  hunt: foreignKey,
  tags: tagList,
  title: nonEmptyString,
  url: z.string().url().optional(),
  answers: answer.array(),
  expectedAnswerCount: z.number().int().nonnegative(),
  replacedBy: foreignKey.optional(),
}));

export default Puzzle;
