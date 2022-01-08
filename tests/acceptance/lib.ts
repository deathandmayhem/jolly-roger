/* eslint-disable no-console */
import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
import { resetDatabase } from 'meteor/xolvio:cleaner';

if (Meteor.isServer) {
  Meteor.methods({
    'test.resetDatabase': function () {
      resetDatabase();
      Migrations.migrateTo('latest');
      console.log('Reset database');
    },
  });
}
