import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from '../base';
import { Overrides, buildSchema, inheritSchema } from '../typedSchemas';

const RouterFields = t.type({
  hunt: t.string,
  call: t.string,
  createdServer: t.string,
  routerId: t.string, // mediasoup identifier
  rtpCapabilities: t.string, // JSON-encoded
});

const RouterFieldsOverrides: Overrides<t.TypeOf<typeof RouterFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  call: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  createdServer: {
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  routerId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
  rtpCapabilities: {
    denyUpdate: true,
  },
};

const [RouterCodec, RouterOverrides] = inheritSchema(
  BaseCodec,
  RouterFields,
  BaseOverrides,
  RouterFieldsOverrides,
);

export { RouterCodec };
export type RouterType = t.TypeOf<typeof RouterCodec>;

export default buildSchema(RouterCodec, RouterOverrides);
