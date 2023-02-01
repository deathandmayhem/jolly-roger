import { z } from 'zod';
import { nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const FeatureFlag = withCommon(z.object({
  name: nonEmptyString,
  // type represents the mode of a feature flag. If a feature flag
  // with a given name doesn't exist, it's assumed to be of type
  // "off"
  type: z.enum(['off', 'on']),
}));

export default FeatureFlag;
