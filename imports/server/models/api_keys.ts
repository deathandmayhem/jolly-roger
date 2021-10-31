import isAdmin from '../../lib/is-admin';
import Base from '../../lib/models/base';
import APIKeySchema, { APIKeyType } from '../schemas/api_key';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeySchema);
APIKeys.publish(function (q) {
  // Server admins can access all API keys
  if (isAdmin(this.userId)) {
    return q;
  }

  return [];
});

export default APIKeys;
