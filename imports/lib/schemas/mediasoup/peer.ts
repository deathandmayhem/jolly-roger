import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

// Peer tracks room membership. When the first peer for a call is created,
// create a corresponding Room on the same server.
const PeerFields = t.type({
  createdServer: t.string,
  hunt: t.string,
  call: t.string,
  tab: t.string,
  muted: t.boolean,
  deafened: t.boolean,
});

const PeerFieldsOverrides: Overrides<t.TypeOf<typeof PeerFields>> = {
  createdServer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  call: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  tab: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
};

const [PeerCodec, PeerOverrides] = inheritSchema(
  BaseCodec,
  PeerFields,
  BaseOverrides,
  PeerFieldsOverrides,
);

export { PeerCodec };
export type PeerType = t.TypeOf<typeof PeerCodec>;

export default buildSchema(PeerCodec, PeerOverrides);
