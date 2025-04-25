const GdriveMimeTypes = {
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  document: "application/vnd.google-apps.document",
  drawing: "application/vnd.google-apps.drawing",
};

export default GdriveMimeTypes;
export type GdriveMimeTypesType = keyof typeof GdriveMimeTypes;
