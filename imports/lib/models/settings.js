import { Roles } from 'meteor/nicolaslopezj:roles';
import Base from './base';
import SettingsSchema from '../schemas/settings';

const Settings = new Base('settings');
Settings.attachSchema(SettingsSchema);

function queryModifier(q) {
  // Only allow admins to pull down Settings.
  if (Roles.userHasRole(this.userId, 'admin')) {
    return q;
  }

  // Make the query evaluate to nothing
  return { $and: [false, q] };
}
Settings.publish(queryModifier);
export default Settings;
