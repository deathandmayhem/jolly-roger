import type { ModelType } from '../../lib/models/Model';
import SoftDeletedModel from '../../lib/models/SoftDeletedModel';
import APIKey from '../schemas/APIKey';

const APIKeys = new SoftDeletedModel('jr_api_keys', APIKey);
export type APIKeyType = ModelType<typeof APIKeys>;

export default APIKeys;
