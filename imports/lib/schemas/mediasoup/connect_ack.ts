import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

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
  direction: {
    denyUpdate: true,
  },
  transport: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
};

const [ConnectAckCodec, ConnectAckOverrides] = inheritSchema(
  BaseCodec, ConnectAckFields,
  BaseOverrides, ConnectAckFieldsOverrides,
);

export { ConnectAckCodec };
export type ConnectAckType = t.TypeOf<typeof ConnectAckCodec>;

export default buildSchema(ConnectAckCodec, ConnectAckOverrides);
