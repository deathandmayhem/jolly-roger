import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { documentId: string; filename: string; mimeType: string },
  | { publicUrl: string; uploadUrl: string; fields: Record<string, string> }
  | undefined
>("Documents.methods.createImageUpload");
