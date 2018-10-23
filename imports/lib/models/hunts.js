import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import HuntsSchema from '../schemas/hunts.js';
import Base from './base.js';

const Hunts = new Base('hunts');
Hunts.attachSchema(HuntsSchema);

// All hunts are accessible, since they only contain metadata
Hunts.publish();

// operators are always allowed to join someone to a hunt; non-admins
// can if they are a member and if the hunt allows open signups.
Roles.loggedInRole.allow('hunt.join', (huntId) => {
  if (!_.include(Meteor.user().hunts, huntId)) {
    return false;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  return hunt.openSignups;
});

export default Hunts;
