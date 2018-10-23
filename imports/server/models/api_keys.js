import Base from '../../lib/models/base.js';
import APIKeysSchema from '../schemas/api_keys.js';

const APIKeys = new Base('api_keys');
APIKeys.attachSchema(APIKeysSchema);
APIKeys.publish(function (q) {
  // Operators can access all API keys
  if (Roles.userHasRole(this.userId, 'admin')) {
    return q;
  }

  return [];
});

export default APIKeys;
