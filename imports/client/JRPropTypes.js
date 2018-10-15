import PropTypes from 'prop-types';
import { SubsCache } from 'meteor/ccorcos:subs-cache';

const JRPropTypes = {
  subs: PropTypes.instanceOf(SubsCache).isRequired,
};

export default JRPropTypes;
