import type { SettingNameType } from '../schemas/Setting';
import TypedPublication from './TypedPublication';

export default new TypedPublication<{ name: SettingNameType }>(
  'Settings.publications.byName'
);
