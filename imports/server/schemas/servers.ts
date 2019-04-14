import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const ServerCodec = t.type({
  // unlike most updatedAt values, this one also gets set on created
  // for convenience
  updatedAt: date,
});
export type ServerType = t.TypeOf<typeof ServerCodec>;

const ServerOverrides: Overrides<ServerType> = {
  updatedAt: {
    autoValue() {
      return new Date();
    },
  },
};

const Servers = buildSchema(ServerCodec, ServerOverrides);

export default Servers;
