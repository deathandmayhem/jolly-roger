import { Meteor } from 'meteor/meteor';
import UserSchema from '../schemas/users';

Meteor.users.attachSchema(UserSchema);
