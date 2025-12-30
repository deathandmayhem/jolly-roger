import { z } from "zod";
import { nonEmptyString } from "../../lib/models/customTypes";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";
import withCommon from "../../lib/models/withCommon";

// A way to authenticate uploads before accepting them.
// The flow is:
// * client calls Meteor method to request an upload token, which checks auth
//   and then generates an upload token
// * server creates an upload token and returns the _id to the client
// * client does a post to /fileUpload/:_id , and since _id is unguessable, we
//   can treat this as authenticated and complete whatever task was started before
//   the upload was initiated.
const UploadToken = withCommon(
  z.object({
    asset: nonEmptyString,
    mimeType: nonEmptyString,
  }),
);

const UploadTokens = new Model("jr_upload_tokens", UploadToken);
export type UploadTokenType = ModelType<typeof UploadTokens>;

export default UploadTokens;
