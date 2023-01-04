import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

// DriveActivityLatest captures the most recent timestamp we've seen from the
// Google Drive Activity API. It is a singleton collection, with _id "default"
const DriveActivityLatestCodec = t.type({
  _id: t.string,
  ts: date,
});

export type DriveActivityLatestType = t.TypeOf<typeof DriveActivityLatestCodec>;

const DriveActivityLatestOverrides: Overrides<DriveActivityLatestType> = {
  _id: {
    denyUpdate: true,
  },
};

const DriveActivityLatest = buildSchema(
  DriveActivityLatestCodec,
  DriveActivityLatestOverrides,
);

export default DriveActivityLatest;
