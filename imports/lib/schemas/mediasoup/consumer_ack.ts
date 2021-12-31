import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const ConsumerAckFields = t.type({
  createdServer: t.string,
  routedServer: t.string,
  call: t.string,
  peer: t.string,
  transportRequest: t.string,
  consumer: t.string,
  producerId: t.string,
});

const ConsumerAckFieldsOverrides: Overrides<t.TypeOf<typeof ConsumerAckFields>> = {
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
  transportRequest: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  consumer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  producerId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
};

const [ConsumerAckCodec, ConsumerAckOverrides] = inheritSchema(
  BaseCodec, ConsumerAckFields,
  BaseOverrides, ConsumerAckFieldsOverrides,
);

export { ConsumerAckCodec };
export type ConsumerAckType = t.TypeOf<typeof ConsumerAckCodec>;

export default buildSchema(ConsumerAckCodec, ConsumerAckOverrides);
