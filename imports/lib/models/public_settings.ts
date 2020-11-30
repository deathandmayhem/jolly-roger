import { Meteor } from 'meteor/meteor';
import PublicSettingsSchema, { PublicSettingType } from '../schemas/public_settings';
import Base from './base';

const PublicSettings = new Base<PublicSettingType>('public_settings');
PublicSettings.attachSchema(PublicSettingsSchema);

// All public settings are accessible by all clients at all times, including to
// not-logged-in-users.
Meteor.publish('mongo.public_settings', () => PublicSettings.find());

// Public settings should always be subscribed to by all clients.
if (Meteor.isClient) {
  Meteor.subscribe('mongo.public_settings');
}

export default PublicSettings;
