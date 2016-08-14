import React from 'react';
import { SubsManager } from 'meteor/meteorhacks:subs-manager';

const JRPropTypes = {
  subs: React.PropTypes.instanceOf(SubsManager).isRequired,
};

export { JRPropTypes };
