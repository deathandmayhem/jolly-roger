import { z } from 'zod';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const Tag = withCommon(z.object({
  name: nonEmptyString,
  hunt: foreignKey,
}));

export default Tag;
