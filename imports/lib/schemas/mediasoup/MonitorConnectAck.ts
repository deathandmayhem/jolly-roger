import * as t from 'io-ts';
import { Id } from '../regexes';
import type { Overrides } from '../typedSchemas';
import { buildSchema } from '../typedSchemas';

const MonitorConnectAckCodec = t.type({
  _id: t.string,
  initiatingServer: t.string,
  receivingServer: t.string,
  transportId: t.string,
  ip: t.string,
  port: t.number,
  srtpParameters: t.union([t.undefined, t.string]), /* JSON-serialized if present */
});

export type MonitorConnectAckType = t.TypeOf<typeof MonitorConnectAckCodec>;

const MonitorConnectAckOverrides: Overrides<MonitorConnectAckType> = {
  _id: {
    regEx: Id,
    denyUpdate: true,
  },
  initiatingServer: {
    regEx: Id,
    denyUpdate: true,
  },
  receivingServer: {
    regEx: Id,
    denyUpdate: true,
  },
  transportId: {
    regEx: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    denyUpdate: true,
  },
  ip: {
    denyUpdate: true,
  },
  port: {
    denyUpdate: true,
  },
  srtpParameters: {
    denyUpdate: true,
  },
};

export default buildSchema(MonitorConnectAckCodec, MonitorConnectAckOverrides);
