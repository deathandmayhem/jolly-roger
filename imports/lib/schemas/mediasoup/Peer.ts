import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

// Peer tracks room membership. When the first peer for a call is created,
// create a corresponding Room on the same server.
const PeerFields = t.type({
  createdServer: t.string,
  hunt: t.string,
  call: t.string,
  tab: t.string,
  initialPeerState: t.union([t.literal('active'), t.literal('muted'), t.literal('deafened')]),
  muted: t.boolean,
  deafened: t.boolean,
});

const PeerFieldsOverrides: Overrides<t.TypeOf<typeof PeerFields>> = {
  createdServer: {
    regEx: Id,
    denyUpdate: true,
  },
  hunt: {
    regEx: Id,
    denyUpdate: true,
  },
  call: {
    regEx: Id,
    denyUpdate: true,
  },
  tab: {
    regEx: Id,
    denyUpdate: true,
  },
  initialPeerState: {
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
