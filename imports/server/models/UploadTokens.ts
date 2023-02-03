import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import UploadToken from '../schemas/UploadToken';

const UploadTokens = new Model('jr_upload_tokens', UploadToken);
export type UploadTokenType = ModelType<typeof UploadTokens>;

export default UploadTokens;
