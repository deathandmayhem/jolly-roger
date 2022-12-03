import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

// PeerRemoteMute is an audit log of when one user mutes another user. When a
// user is remote-muted, their Peer record is also updated, which tracks current
// state.
const PeerRemoteMuteFields = t.type({
  call: t.string,
  peer: t.string,
});

const PeerRemoteMuteFieldsOverrides: Overrides<t.TypeOf<typeof PeerRemoteMuteFields>> = {
  call: {
    regEx: Id,
    denyUpdate: true,
  },
  peer: {
    regEx: Id,
    denyUpdate: true,
  },
};

const [PeerRemoteMuteCodec, PeerRemoteMuteOverrides] = inheritSchema(
  BaseCodec,
  PeerRemoteMuteFields,
  BaseOverrides,
  PeerRemoteMuteFieldsOverrides,
);

export { PeerRemoteMuteCodec };
export type PeerRemoteMuteType = t.TypeOf<typeof PeerRemoteMuteCodec>;

export default buildSchema(PeerRemoteMuteCodec, PeerRemoteMuteOverrides);
