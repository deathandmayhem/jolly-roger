import { Meteor } from 'meteor/meteor';
import Base from './base';
import ProfilesSchema from '../schemas/profiles';

const Profiles = new class extends Base {
  constructor() {
    super('profiles');
  }

  subscribeDisplayNames(subs = Meteor) {
    return subs.subscribe('mongo.profiles', {}, { fields: { displayName: 1 } });
  }

  displayNames() {
    const displayNames = {};
    this.find().forEach((p) => {
      displayNames[p._id] = p.displayName;
    });

    return displayNames;
  }
}();
Profiles.attachSchema(ProfilesSchema);

// Ideally, we'd only publish profiles whose hunt set overlaps with
// yours, but that's hard so for now publish everything
Profiles.publish();

export default Profiles;
