import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../Base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const ConsumerFields = t.type({
  createdServer: t.string,
  call: t.string,
  peer: t.string,
  transportRequest: t.string,
  transportId: t.string,
  producerPeer: t.string,
  consumerId: t.string,
  producerId: t.string,
  kind: t.union([t.literal('audio'), t.literal('video')]),
  rtpParameters: t.string, // JSON-encoded
  paused: t.boolean,
});

const ConsumerFieldsOverrides: Overrides<t.TypeOf<typeof ConsumerFields>> = {
  createdServer: {
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
  transportRequest: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  transportId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },

  producerPeer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  consumerId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
  producerId: {
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

const [ConsumerCodec, ConsumerOverrides] = inheritSchema(
  BaseCodec,
  ConsumerFields,
  BaseOverrides,
  ConsumerFieldsOverrides,
);

export { ConsumerCodec };
export type ConsumerType = t.TypeOf<typeof ConsumerCodec>;

export default buildSchema(ConsumerCodec, ConsumerOverrides);
