import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import HuntsSchema, { HuntType } from '../schemas/hunts';
import Base from './base';

const Hunts = new Base<HuntType>('hunts');
Hunts.attachSchema(HuntsSchema);

// All hunts are accessible, since they only contain metadata
Hunts.publish();

// admins are always allowed to join someone to a hunt
// non-admins (including operators) can if they are a member of that hunt
// already and if the hunt allows open signups.
// It's possible we should always allow operators to add someone to a hunt?
Roles.loggedInRole.allow('hunt.join', (huntId) => {
  const user = Meteor.user();
  if (!user) {
    return false;
  }

  const joinedHunts = user.hunts;
  if (!joinedHunts) {
    return false;
  }

  if (!joinedHunts.includes(huntId)) {
    return false;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  return hunt.openSignups;
});

export default Hunts;
