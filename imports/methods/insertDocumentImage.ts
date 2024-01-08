import TypedMethod from "./TypedMethod";

type UploadImageSource = {
  source: "upload";
  filename: string;
  contents: string /* base64-encoded data url */;
};

type LinkImageSource = {
  source: "link";
  url: string;
};

export type ImageSource = UploadImageSource | LinkImageSource;

export default new TypedMethod<
  { documentId: string; sheetId: number; image: ImageSource },
  void
>("Documents.methods.insertImage");
