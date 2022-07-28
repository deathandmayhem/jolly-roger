const GdriveMimeTypes = {
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  document: 'application/vnd.google-apps.document',
};

export default GdriveMimeTypes;
export type GdriveMimeTypesType = keyof typeof GdriveMimeTypes;
