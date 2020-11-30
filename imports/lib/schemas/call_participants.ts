import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const CallParticipantFields = t.type({
  hunt: t.string, // used for ACL subscriptions
  call: t.string, // consider renaming to puzzle?

  // Need a tab ID here too so that different browser tabs won't
  // try to autoconnect
  tab: t.string,

  muted: t.boolean,
  deafened: t.boolean,
});

const CallParticipantFieldsOverrides: Overrides<t.TypeOf<typeof CallParticipantFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  call: {
    regEx: SimpleSchema.RegEx.Id,
  },
  tab: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [CallParticipantCodec, CallParticipantOverrides] = inheritSchema(
  BaseCodec, CallParticipantFields,
  BaseOverrides, CallParticipantFieldsOverrides,
);
export { CallParticipantCodec };
export type CallParticipantType = t.TypeOf<typeof CallParticipantCodec>;

const CallParticipants = buildSchema(CallParticipantCodec, CallParticipantOverrides);

export default CallParticipants;
