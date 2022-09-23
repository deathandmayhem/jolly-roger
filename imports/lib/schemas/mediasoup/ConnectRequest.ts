import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
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
  direction: {
    denyUpdate: true,
  },
  transport: {
    regEx: Id,
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
