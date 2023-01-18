import * as t from 'io-ts';
import { answerify } from '../../model-helpers';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import type { Overrides } from './typedSchemas';
import { buildSchema, inheritSchema } from './typedSchemas';
import { ValidUrl } from './validators';

const PuzzleFields = t.type({
  hunt: t.string,
  tags: t.array(t.string),
  title: t.string,
  url: t.union([t.string, t.undefined]),
  answers: t.array(t.string),
  expectedAnswerCount: t.number,
  replacedBy: t.union([t.string, t.undefined]),
});

const PuzzleFieldsOverrides: Overrides<t.TypeOf<typeof PuzzleFields>> = {
  hunt: {
    regEx: Id,
  },
  tags: {
    defaultValue: [],
    array: {
      regEx: Id,
    },
  },
  url: {
    custom: ValidUrl,
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
  replacedBy: {
    regEx: Id,
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
