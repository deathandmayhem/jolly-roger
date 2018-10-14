import React from 'react';
import { SubsCache } from 'meteor/ccorcos:subs-cache';

const JRPropTypes = {
  subs: React.PropTypes.instanceOf(SubsCache).isRequired,
};

export default JRPropTypes;
