import SimpleSchema from 'simpl-schema';
import Base from './base';

const Settings = new SimpleSchema({
  name: {
    type: String,
  },
  value: {
    type: Object,
    blackbox: true,
  },
});
Settings.extend(Base);

export default Settings;
