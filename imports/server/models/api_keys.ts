import Base from '../../lib/models/base';
import { isAdmin } from '../../lib/permission_stubs';
import APIKeysSchema, { APIKeyType } from '../schemas/api_keys';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeysSchema);
APIKeys.publish(function (q) {
  // Server admins can access all API keys
  if (isAdmin(this.userId)) {
    return q;
  }

  return [];
});

export default APIKeys;
