import { Meteor } from 'meteor/meteor';
import UserSchema from '../schemas/users.js';

Meteor.users.attachSchema(UserSchema);
