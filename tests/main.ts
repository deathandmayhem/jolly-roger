/* eslint-disable import/first */
import { Meteor } from 'meteor/meteor';

import './unit/imports/lib/calendarTimeFormat';
import './unit/imports/lib/relativeTimeFormat';

if (Meteor.isServer) {
  require('./unit/imports/server/MigrationRegistry');
}

import './acceptance/authentication';
import './acceptance/profiles';
import './acceptance/smoke';
