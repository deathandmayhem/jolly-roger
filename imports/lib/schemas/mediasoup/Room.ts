import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../Base';
import { Id } from '../regexes';
import type { Overrides } from '../typedSchemas';
import { inheritSchema, buildSchema } from '../typedSchemas';

// Room tracks the server assignment for a room. Its presence triggers the
// mediasoup integration to create a router.

const RoomFields = t.type({
  hunt: t.string,
  call: t.string,
  routedServer: t.string,
});

const RoomFieldsOverrides: Overrides<t.TypeOf<typeof RoomFields>> = {
  hunt: {
    regEx: Id,
    denyUpdate: true,
  },
  call: {
    regEx: Id,
    denyUpdate: true,
  },
  routedServer: {
    regEx: Id,
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
