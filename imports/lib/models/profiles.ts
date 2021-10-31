import { Meteor } from 'meteor/meteor';
import ProfileSchema, { ProfileType } from '../schemas/profile';
import Base from './base';

const Profiles = new class extends Base<ProfileType> {
  constructor() {
    super('profiles');
  }

  subscribeDisplayNames() {
    return Meteor.subscribe('mongo.profiles', {}, { fields: { displayName: 1 } });
  }

  subscribeAvatars() {
    return Meteor.subscribe('mongo.profiles', {}, {
      fields: { displayName: 1, discordAccount: 1 },
    });
  }

  displayNames() {
    const displayNames: Record<string, string> = {};
    this.find().forEach((p) => {
      displayNames[p._id] = p.displayName;
    });

    return displayNames;
  }
}();
Profiles.attachSchema(ProfileSchema);

// Ideally, we'd only publish profiles whose hunt set overlaps with
// yours, but that's hard so for now publish everything
Profiles.publish();

export default Profiles;
