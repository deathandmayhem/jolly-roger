import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

// TransportState tracks the server-side state of a Transport object. None of
// this data is needed for the actual WebRTC connection, but is collected purely
// for debugging purposes
//
// We have to use the Mediasoup-generated transport ID as the unique key,
// because the Meteor ID isn't available until after the transport is created.

const TransportStateFields = t.type({
  createdServer: t.string,
  transportId: t.string, // mediasoup identifier
  iceState: t.union([t.string, t.undefined]),
  iceSelectedTuple: t.union([t.string, t.undefined]), // JSON-encoded
  dtlsState: t.union([t.string, t.undefined]),
});

// Both of these fields should be set to denyUpdate: true, but SimplSchema seems
// to think that prevents using them as the query term in an upsert
const TransportStateFieldsOverrides: Overrides<t.TypeOf<typeof TransportStateFields>> = {
  createdServer: {
    regEx: SimpleSchema.RegEx.Id,
  },
  transportId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  },
};

const [TransportStateCodec, TransportStateOverrides] = inheritSchema(
  BaseCodec,
  TransportStateFields,
  BaseOverrides,
  TransportStateFieldsOverrides,
);

export { TransportStateCodec };
export type TransportStateType = t.TypeOf<typeof TransportStateCodec>;

export default buildSchema(TransportStateCodec, TransportStateOverrides);
