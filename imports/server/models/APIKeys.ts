import Base from '../../lib/models/Base';
import { checkAdmin } from '../../lib/permission_stubs';
import APIKeySchema, { APIKeyType } from '../schemas/APIKey';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeySchema);
APIKeys.publish((userId) => {
  // Server admins can access all API keys
  checkAdmin(userId);
  return undefined;
});

export default APIKeys;
