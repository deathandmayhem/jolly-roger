import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.Settings = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },
    value: {
      type: Object,
      blackbox: true,
    },
  },
]);

Models.Settings = new Models.Base('settings');
Models.Settings.attachSchema(Schemas.Settings);
