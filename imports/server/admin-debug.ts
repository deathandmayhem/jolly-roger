import { Meteor } from 'meteor/meteor';
import CallParticipants from '../lib/models/call_participants';
import CallSignals from '../lib/models/call_signals';
import { checkAdmin } from '../lib/permission_stubs';

// Publish all call signals only to admins to support /rtcdebug
Meteor.publish('rtcdebug', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  checkAdmin(this.userId);

  return [
    CallParticipants.find({}),
    CallSignals.find({}),
  ];
});
