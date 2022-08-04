/* eslint-disable import/first */
import { Meteor } from 'meteor/meteor';

import './unit/imports/lib/calendarTimeFormat';
import './unit/imports/lib/puzzle-sort-and-group';
import './unit/imports/lib/relativeTimeFormat';
import './unit/imports/lib/ValidateShape';

if (Meteor.isServer) {
  require('./unit/imports/server/MigrationRegistry');
}

import './acceptance/authentication';
import './acceptance/profiles';
import './acceptance/smoke';
