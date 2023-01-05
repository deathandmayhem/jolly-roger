import type { SettingType } from '../schemas/Setting';
import Base from './Base';

const Settings = new Base<SettingType>('settings');

export default Settings;
