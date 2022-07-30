import TypedMethod from './TypedMethod';

export default new TypedMethod<{ assetName: string, assetMimeType: string }, string>(
  'UploadTokens.methods.generate'
);
