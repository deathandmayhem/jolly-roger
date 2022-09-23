import * as t from 'io-ts';
import { answerify } from '../../model-helpers';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
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
  direction: t.union([t.Int, t.undefined]),
  // Submitted-evaluated probability that the answer is right (also only
  // optional on older hunts)
  confidence: t.union([t.Int, t.undefined]),
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
    regEx: Id,
  },
  puzzle: {
    regEx: Id,
  },
  guess: {
    autoValue() {
      if (this.isSet && this.value) {
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
  BaseCodec,
  GuessFields,
  BaseOverrides,
  GuessFieldsOverrides
);
export { GuessCodec };
// Note that we use t.OutputOf here instead of t.TypeOf because of Guess's use
// of t.Int. io-ts really wants us to "encode" and "decode" values through it as
// a form of runtime type validation (where it would add the "brand" for
// validated integers), but we use SimpleSchema for that and don't really want
// to deal with branded types.
//
// It's possible that t.OutputOf is the more correct choice for us to use in
// general, but that's not a conversion to be done now.
export type GuessType = t.OutputOf<typeof GuessCodec>;

const Guess = buildSchema(GuessCodec, GuessOverrides);

export default Guess;
