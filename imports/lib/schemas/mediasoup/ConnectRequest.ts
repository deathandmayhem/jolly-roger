import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../Base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const ConnectRequestFields = t.type({
  createdServer: t.string,
  routedServer: t.string,
  call: t.string,
  peer: t.string,
  transportRequest: t.string,
  direction: t.union([t.literal('send'), t.literal('recv')]),
  transport: t.string,
  dtlsParameters: t.string, // JSON-encoded
});

const ConnectRequestFieldsOverrides: Overrides<t.TypeOf<typeof ConnectRequestFields>> = {
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
  direction: {
    denyUpdate: true,
  },
  transport: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  dtlsParameters: {
    denyUpdate: true,
  },
};

const [ConnectRequestCodec, ConnectRequestOverrides] = inheritSchema(
  BaseCodec,
  ConnectRequestFields,
  BaseOverrides,
  ConnectRequestFieldsOverrides,
);

export { ConnectRequestCodec };
export type ConnectRequestType = t.TypeOf<typeof ConnectRequestCodec>;

export default buildSchema(ConnectRequestCodec, ConnectRequestOverrides);
