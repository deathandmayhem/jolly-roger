import Base from '../../lib/models/Base';
import UploadTokenSchema, { UploadTokenType } from '../schemas/UploadToken';

const UploadTokens = new Base<UploadTokenType>('upload_tokens');
UploadTokens.attachSchema(UploadTokenSchema);

// UploadTokens are unpublished.

export default UploadTokens;
