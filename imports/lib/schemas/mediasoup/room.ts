import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, inheritSchema, buildSchema } from '../typedSchemas';

// Room tracks the server assignment for a room. Its presence triggers the
// mediasoup integration to create a router.

const RoomFields = t.type({
  call: t.string,
  routedServer: t.string,
});

const RoomFieldsOverrides: Overrides<t.TypeOf<typeof RoomFields>> = {
  call: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  routedServer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
};

const [RoomCodec, RoomOverrides] = inheritSchema(
  BaseCodec,
  RoomFields,
  BaseOverrides,
  RoomFieldsOverrides,
);

export { RoomCodec };
export type RoomType = t.TypeOf<typeof RoomCodec>;

export default buildSchema(RoomCodec, RoomOverrides);
