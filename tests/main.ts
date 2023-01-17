/* eslint-disable import/first */
import { Meteor } from 'meteor/meteor';

import './unit/imports/lib/calendarTimeFormat';
import './unit/imports/lib/puzzle-sort-and-group';
import './unit/imports/lib/relativeTimeFormat';
import './unit/imports/lib/ValidateShape';

if (Meteor.isServer) {
  require('./unit/imports/server/MigrationRegistry');
  require('./unit/imports/server/Base');
}

import './acceptance/authentication';
import './acceptance/chatHooks';
import './acceptance/profiles';
import './acceptance/smoke';
