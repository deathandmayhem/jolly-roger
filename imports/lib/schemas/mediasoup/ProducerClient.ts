import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const ProducerClientFields = t.type({
  createdServer: t.string,
  routedServer: t.string,
  call: t.string,
  peer: t.string,
  transport: t.string,
  transportRequest: t.string,
  // client-generated GUID for client to pair ProducerClient/ProducerServer with local track
  trackId: t.string,
  kind: t.union([t.literal('audio'), t.literal('video')]),
  rtpParameters: t.string, // JSON-encoded
  paused: t.boolean,
});

const ProducerClientFieldsOverrides: Overrides<t.TypeOf<typeof ProducerClientFields>> = {
  createdServer: {
    regEx: Id,
    denyUpdate: true,
  },
  routedServer: {
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
  transport: {
    regEx: Id,
    denyUpdate: true,
  },
  transportRequest: {
    regEx: Id,
    denyUpdate: true,
  },
  trackId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
  kind: {
    denyUpdate: true,
  },
  rtpParameters: {
    denyUpdate: true,
  },
};

const [ProducerClientCodec, ProducerClientOverrides] = inheritSchema(
  BaseCodec,
  ProducerClientFields,
  BaseOverrides,
  ProducerClientFieldsOverrides,
);

export { ProducerClientCodec };
export type ProducerClientType = t.TypeOf<typeof ProducerClientCodec>;

export default buildSchema(ProducerClientCodec, ProducerClientOverrides);
