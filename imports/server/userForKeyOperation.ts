import { Meteor } from 'meteor/meteor';
import { userIdIsAdmin } from '../lib/is-admin';

export default function userForKeyOperation(currentUser: string, forUser?: string) {
  const canOverrideUser = userIdIsAdmin(currentUser);

  if (forUser && !canOverrideUser) {
    throw new Meteor.Error(403, 'Only server admins can fetch other users\' keys');
  }

  return forUser || currentUser;
}
