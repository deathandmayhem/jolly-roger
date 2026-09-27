import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    data: Uint8Array;
    mimeType: string;
  },
  { customAvatar: string }
>("Users.methods.uploadCustomAvatar");
