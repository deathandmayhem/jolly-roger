import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { answerify } from '../../model-helpers';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const GuessFields = t.type({
  // Denormalized in so subscriptions can filter on hunt without having to join on Puzzles
  hunt: t.string,
  // The puzzle this guess is for.
  puzzle: t.string,
  // The text of this guess.
  guess: t.string,
  // Whether this was forward solved (10), backwards solved (-10), or somewhere
  // in between (only optional in that older hunts won't have it)
  direction: t.union([t.Integer, t.undefined]),
  // Submitted-evaluated probability that the answer is right (also only
  // optional on older hunts)
  confidence: t.union([t.Integer, t.undefined]),
  // The state of this guess, as handled by the operators:
  // * 'pending' means "shows up in the operator queue"
  // * 'correct', "incorrect", and "rejected" all mean "no longer in the operator queue"
  // * 'incorrect' answers should be listed or at least discoverable on the puzzle page
  // * 'correct' answers should be accompanied by an update to the corresponding puzzle's answer
  //   field.
  state: t.union([t.literal('pending'), t.literal('correct'), t.literal('incorrect'), t.literal('rejected')]),
});

const GuessFieldsOverrides: Overrides<t.TypeOf<typeof GuessFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  puzzle: {
    regEx: SimpleSchema.RegEx.Id,
  },
  guess: {
    autoValue() {
      if (this.isSet) {
        return answerify(this.value);
      }

      return undefined;
    },
  },
  direction: {
    min: -10,
    max: 10,
  },
  confidence: {
    min: 0,
    max: 100,
  },
};

const [GuessCodec, GuessOverrides] = inheritSchema(
  BaseCodec, GuessFields,
  BaseOverrides, GuessFieldsOverrides
);
export { GuessCodec };
export type GuessType = t.TypeOf<typeof GuessCodec>;

const Guesses = buildSchema(GuessCodec, GuessOverrides);

export default Guesses;
