import Setting from '../schemas/Setting';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Settings = new SoftDeletedModel('jr_settings', Setting);

export type SettingType = ModelType<typeof Settings>;

export default Settings;
