import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const ServerType = t.type({
  // unlike most updatedAt values, this one also gets set on created
  // for convenience
  updatedAt: date,
});

const ServerOverrides: Overrides<t.TypeOf<typeof ServerType>> = {
  updatedAt: {
    autoValue() {
      return new Date();
    },
  },
};

const Servers = buildSchema(ServerType, ServerOverrides);

export default Servers;
