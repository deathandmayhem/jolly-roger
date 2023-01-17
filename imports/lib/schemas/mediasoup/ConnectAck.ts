import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import type { Overrides } from '../typedSchemas';
import { inheritSchema, buildSchema } from '../typedSchemas';

const ConnectAckFields = t.type({
  createdServer: t.string,
  call: t.string,
  peer: t.string,
  transportRequest: t.string,
  direction: t.union([t.literal('send'), t.literal('recv')]),
  transport: t.string,
});

const ConnectAckFieldsOverrides: Overrides<t.TypeOf<typeof ConnectAckFields>> = {
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
  transport: {
    regEx: Id,
    denyUpdate: true,
  },
};

const [ConnectAckCodec, ConnectAckOverrides] = inheritSchema(
  BaseCodec,
  ConnectAckFields,
  BaseOverrides,
  ConnectAckFieldsOverrides,
);

export { ConnectAckCodec };
export type ConnectAckType = t.TypeOf<typeof ConnectAckCodec>;

export default buildSchema(ConnectAckCodec, ConnectAckOverrides);
