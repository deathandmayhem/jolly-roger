import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { puzzleId: string; mimeType: string },
  | { publicUrl: string; uploadUrl: string; fields: Record<string, string> }
  | undefined
>("ChatMessages.methods.createImageUpload");
