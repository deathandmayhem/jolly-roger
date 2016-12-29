import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.APIKeys = new SimpleSchema([
  Schemas.Base,
  {
    user: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    key: {
      type: String,
      regEx: /^[A-Za-z0-9]{32}$/,
    },
  },
]);

Models.APIKeys = new Models.Base('api_keys');
Models.APIKeys.attachSchema(Schemas.APIKeys);
Models.APIKeys.publish(function (q) {
  // Operators can access all API keys
  if (Roles.userHasRole(this.userId, 'admin')) {
    return q;
  }

  return [];
});
