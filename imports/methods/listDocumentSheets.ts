import TypedMethod from './TypedMethod';

export type Sheet = {
  name: string,
  id: number,
};

export default new TypedMethod<{ documentId: string }, Sheet[]>(
  'Documents.methods.listSheets'
);
