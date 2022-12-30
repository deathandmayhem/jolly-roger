import Base from '../../lib/models/Base';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { checkAdmin } from '../../lib/permission_stubs';
import APIKeySchema, { APIKeyType } from '../schemas/APIKey';

const APIKeys = new Base<APIKeyType>('api_keys');
APIKeys.attachSchema(APIKeySchema);
APIKeys.publish(async (userId) => {
  // Server admins can access all API keys
  checkAdmin(await MeteorUsers.findOneAsync(userId));
  return undefined;
});

export default APIKeys;
