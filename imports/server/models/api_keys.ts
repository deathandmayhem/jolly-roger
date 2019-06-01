import { Roles } from 'meteor/nicolaslopezj:roles';
import Base from '../../lib/models/base';
import APIKeysSchema, { APIKeyType } from '../schemas/api_keys';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeysSchema);
APIKeys.publish(function (q) {
  // Server admins can access all API keys
  if (Roles.userHasRole(this.userId, 'admin')) {
    return q;
  }

  return [];
});

export default APIKeys;
