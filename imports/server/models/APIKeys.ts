import { z } from 'zod';
import type { ModelType } from '../../lib/models/Model';
import SoftDeletedModel from '../../lib/models/SoftDeletedModel';
import { foreignKey } from '../../lib/models/customTypes';
import withCommon from '../../lib/models/withCommon';

const APIKey = withCommon(z.object({
  user: foreignKey,
  key: z.string().regex(/^[A-Za-z0-9]{32}$/),
}));

const APIKeys = new SoftDeletedModel('jr_api_keys', APIKey);
export type APIKeyType = ModelType<typeof APIKeys>;

export default APIKeys;
