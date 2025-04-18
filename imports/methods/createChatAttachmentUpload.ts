import { Meteor } from "meteor/meteor";
import type { PresignedPost } from "@aws-sdk/s3-presigned-post";
import TypedMethod from "./TypedMethod";

export interface CreateChatAttachmentUploadResult {
  publicUrl: string;
  uploadUrl: string;
  fields: PresignedPost["fields"];
}

export default new TypedMethod<
  {
    huntId: string;
    puzzleId: string;
    filename: string;
    mimeType: string;
  },
  CreateChatAttachmentUploadResult | undefined
>("ChatMessages.methods.createAttachmentUpload");
