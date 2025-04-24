import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    displayName: string;
    phoneNumber?: string;
    dingwords: string[];
    dingwordsOpenMatch?: boolean;
    dingwordsMatchOnce: string[];
  },
  void
>("Users.methods.updateProfile");
