import { z } from 'zod';
import { nonEmptyString } from '../../lib/schemas/customTypes';

// _id is Hunt ID
export const HuntFolder = z.object({
  folder: nonEmptyString,
});

export default HuntFolder;
