import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    apiKeyId: string; // the _id, not the key itself
    forUser?: string; // If provided, the user who owns the API key
  },
  void
>("APIKeys.method.destroy");
