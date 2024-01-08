import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { spreadsheetTemplate?: string; documentTemplate?: string },
  void
>("Setup.methods.configureGdriveTemplates");
