import { Meteor } from 'meteor/meteor';

Meteor.startup(() => Migrations.migrateTo('latest'));
