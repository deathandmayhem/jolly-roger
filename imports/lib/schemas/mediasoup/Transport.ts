import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const TransportFields = t.type({
  createdServer: t.string,
  call: t.string,
  peer: t.string,
  transportRequest: t.string,
  // We adopt the mediasoup client library definition - "send" is
  // client-to-server (i.e. producers); "recv" is server to client (i.e.
  // consumers)
  direction: t.union([t.literal('send'), t.literal('recv')]),
  transportId: t.string, // mediasoup identifier
  iceParameters: t.string, // JSON-encoded
  iceCandidates: t.string, // JSON-encoded
  dtlsParameters: t.string, // JSON-encoded
});

const TransportFieldsOverrides: Overrides<t.TypeOf<typeof TransportFields>> = {
  createdServer: {
    regEx: Id,
    denyUpdate: true,
  },
  call: {
    regEx: Id,
    denyUpdate: true,
  },
  peer: {
    regEx: Id,
    denyUpdate: true,
  },
  transportRequest: {
    regEx: Id,
    denyUpdate: true,
  },
  direction: {
    denyUpdate: true,
  },
  transportId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
  iceParameters: {
    denyUpdate: true,
  },
  iceCandidates: {
    denyUpdate: true,
  },
  dtlsParameters: {
    denyUpdate: true,
  },
};

const [TransportCodec, TransportOverrides] = inheritSchema(
  BaseCodec,
  TransportFields,
  BaseOverrides,
  TransportFieldsOverrides,
);

export { TransportCodec };
export type TransportType = t.TypeOf<typeof TransportCodec>;

export default buildSchema(TransportCodec, TransportOverrides);
