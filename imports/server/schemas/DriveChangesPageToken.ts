import * as t from 'io-ts';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

const DriveChangesPageTokenCodec = t.type({
  _id: t.string,
  token: t.string,
});

export type DriveChangesPageTokenType = t.TypeOf<typeof DriveChangesPageTokenCodec>;

const DriveChangesPageTokenOverrides: Overrides<DriveChangesPageTokenType> = {
  _id: {
    denyUpdate: true,
  },
};

const DriveChangesPageToken = buildSchema(
  DriveChangesPageTokenCodec,
  DriveChangesPageTokenOverrides,
);

export default DriveChangesPageToken;
