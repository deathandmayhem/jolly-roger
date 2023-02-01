import { z } from 'zod';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
const Announcement = withCommon(z.object({
  hunt: foreignKey,
  message: nonEmptyString,
}));

export default Announcement;
