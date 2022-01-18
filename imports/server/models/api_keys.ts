import { userIdIsAdmin } from '../../lib/is-admin';
import Base from '../../lib/models/base';
import APIKeySchema, { APIKeyType } from '../schemas/api_key';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeySchema);
APIKeys.publish((userId, q) => {
  // Server admins can access all API keys
  if (userIdIsAdmin(userId)) {
    return q;
  }

  return undefined;
});

export default APIKeys;
