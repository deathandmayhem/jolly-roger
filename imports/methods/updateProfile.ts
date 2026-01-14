import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    displayName: string;
    phoneNumber?: string;
    dingwords: string;
    dingwordsOpenMatch?: boolean;
    isOffsite?: boolean;
  },
  void
>("Users.methods.updateProfile");
