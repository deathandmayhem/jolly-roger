import Base from '../../lib/models/base';
import UploadTokenSchema, { UploadTokenType } from '../schemas/upload_token';

const UploadTokens = new Base<UploadTokenType>('upload_tokens');
UploadTokens.attachSchema(UploadTokenSchema);

// UploadTokens are unpublished.

export default UploadTokens;
