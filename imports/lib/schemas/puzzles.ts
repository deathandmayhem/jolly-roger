import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { answerify } from '../../model-helpers';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseCodec, BaseOverrides } from './base';

const PuzzleFields = t.type({
  hunt: t.string,
  tags: t.array(t.string),
  title: t.string,
  url: t.union([t.string, t.undefined]),
  answer: t.union([t.string, t.undefined]),
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
  answer: {
    autoValue() {
      if (this.isSet && this.value) {
        return answerify(this.value);
      }

      return undefined;
    },
  },
};

const [PuzzleCodec, PuzzleOverrides] = inheritSchema(
  BaseCodec, PuzzleFields,
  BaseOverrides, PuzzleFieldsOverrides,
);
export { PuzzleCodec };
export type PuzzleType = t.TypeOf<typeof PuzzleCodec>;

const Puzzles = buildSchema(PuzzleCodec, PuzzleOverrides);

export default Puzzles;
