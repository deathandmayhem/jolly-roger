import { z } from 'zod';
import { foreignKey } from '../../lib/schemas/customTypes';
import withCommon from '../../lib/schemas/withCommon';

const APIKey = withCommon(z.object({
  user: foreignKey,
  key: z.string().regex(/^[A-Za-z0-9]{32}$/),
}));

export default APIKey;
