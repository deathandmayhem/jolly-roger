import Base from './base.js';
import SettingsSchema from '../schemas/settings.js';

const Settings = new Base('settings');
Settings.attachSchema(SettingsSchema);

export default Settings;
