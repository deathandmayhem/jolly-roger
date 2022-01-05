import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { answerify } from '../../model-helpers';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const PuzzleFields = t.type({
  hunt: t.string,
  tags: t.array(t.string),
  title: t.string,
  url: t.union([t.string, t.undefined]),
  answers: t.array(t.string),
  expectedAnswerCount: t.number,
});

const PuzzleFieldsOverrides: Overrides<t.TypeOf<typeof PuzzleFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  tags: {
    array: {
      regEx: SimpleSchema.RegEx.Id,
    },
  },
  url: {
    regEx: SimpleSchema.RegEx.Url,
  },
  answers: {
    autoValue() {
      if (this.isSet && this.value) {
        if (typeof this.value === 'string') {
          return answerify(this.value);
        }
        return this.value.map((x) => answerify(x));
      }

      return undefined;
    },
  },
};

const [PuzzleCodec, PuzzleOverrides] = inheritSchema(
  BaseCodec,
  PuzzleFields,
  BaseOverrides,
  PuzzleFieldsOverrides,
);
export { PuzzleCodec };
export type PuzzleType = t.TypeOf<typeof PuzzleCodec>;

const Puzzle = buildSchema(PuzzleCodec, PuzzleOverrides);

export default Puzzle;
