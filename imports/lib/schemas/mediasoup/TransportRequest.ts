import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../Base';
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
