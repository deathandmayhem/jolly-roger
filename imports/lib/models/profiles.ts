import { Meteor } from 'meteor/meteor';
import ProfilesSchema, { ProfileType } from '../schemas/profiles';
import Base from './base';

const Profiles = new class extends Base<ProfileType> {
  constructor() {
    super('profiles');
  }

  subscribeDisplayNames() {
    return Meteor.subscribe('mongo.profiles', {}, { fields: { displayName: 1 } });
  }

  displayNames() {
    const displayNames: Record<string, string> = {};
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
