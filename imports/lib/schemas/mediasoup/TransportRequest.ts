import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

const TransportRequestFields = t.type({
  createdServer: t.string,
  routedServer: t.string,
  call: t.string,
  peer: t.string,
  rtpCapabilities: t.string, // JSON-encoded
});

const TransportRequestFieldsOverrides: Overrides<t.TypeOf<typeof TransportRequestFields>> = {
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
  rtpCapabilities: {
    denyUpdate: true,
  },
};

const [TransportRequestCodec, TransportRequestOverrides] = inheritSchema(
  BaseCodec,
  TransportRequestFields,
  BaseOverrides,
  TransportRequestFieldsOverrides,
);

export { TransportRequestCodec };
export type TransportRequestType = t.TypeOf<typeof TransportRequestCodec>;

export default buildSchema(TransportRequestCodec, TransportRequestOverrides);
