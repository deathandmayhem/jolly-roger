import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
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
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  routedServer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  call: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  peer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  transport: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  transportRequest: {
    regEx: SimpleSchema.RegEx.Id,
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
