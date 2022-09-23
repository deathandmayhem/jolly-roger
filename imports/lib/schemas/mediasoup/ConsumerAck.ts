import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
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
  transportRequest: {
    regEx: Id,
    denyUpdate: true,
  },
  consumer: {
    regEx: Id,
    denyUpdate: true,
  },
  producerId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
};

const [ConsumerAckCodec, ConsumerAckOverrides] = inheritSchema(
  BaseCodec,
  ConsumerAckFields,
  BaseOverrides,
  ConsumerAckFieldsOverrides,
);

export { ConsumerAckCodec };
export type ConsumerAckType = t.TypeOf<typeof ConsumerAckCodec>;

export default buildSchema(ConsumerAckCodec, ConsumerAckOverrides);
