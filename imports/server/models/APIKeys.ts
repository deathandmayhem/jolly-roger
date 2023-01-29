import Base from '../../lib/models/Base';
import type { APIKeyType } from '../schemas/APIKey';

const APIKeys = new Base<APIKeyType>('api_keys');

export default APIKeys;
