import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    displayName: string;
    phoneNumber?: string;
    dingwords: string[];
    dingwordsOpenMatch?: boolean;
  },
  void
>("Users.methods.updateProfile");
