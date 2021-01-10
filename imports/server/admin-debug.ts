import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import CallParticipants from '../lib/models/call_participants';
import CallSignals from '../lib/models/call_signals';

// Publish all call signals only to admins to support /rtcdebug
Meteor.publish('rtcdebug', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  if (!Roles.userHasRole(this.userId, 'admin')) {
    throw new Meteor.Error(401, 'Not an admin');
  }

  return [
    CallParticipants.find({}),
    CallSignals.find({}),
  ];
});
