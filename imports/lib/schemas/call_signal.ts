import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const CallSignalMessageFields = t.type({
  type: t.union([t.literal('sdp'), t.literal('iceCandidate')]),
  content: t.string,
});

export type CallSignalMessageType = t.TypeOf<typeof CallSignalMessageFields>;

// TODO: create indexes on both initiator and responder
const CallSignalFields = t.type({
  sender: t.string, // CallParticipant ID
  target: t.string, // CallParticipant ID

  messages: t.array(CallSignalMessageFields),
});

const CallSignalFieldsOverrides: Overrides<t.TypeOf<typeof CallSignalFields>> = {
  sender: {
    regEx: SimpleSchema.RegEx.Id,
  },
  target: {
    regEx: SimpleSchema.RegEx.Id,
  },
  // SDP and candidate strings we treat as opaque.
};

const [CallSignalCodec, CallSignalOverrides] = inheritSchema(
  BaseCodec, CallSignalFields,
  BaseOverrides, CallSignalFieldsOverrides,
);
export { CallSignalCodec };
export type CallSignalType = t.TypeOf<typeof CallSignalCodec>;

const CallSignal = buildSchema(CallSignalCodec, CallSignalOverrides);

export default CallSignal;
