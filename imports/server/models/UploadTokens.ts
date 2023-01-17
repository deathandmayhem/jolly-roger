import Base from '../../lib/models/Base';
import { UploadTokenType } from '../schemas/UploadToken';

const UploadTokens = new Base<UploadTokenType>('upload_tokens');

// UploadTokens are unpublished.

export default UploadTokens;
