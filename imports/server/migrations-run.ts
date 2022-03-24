import { Meteor } from 'meteor/meteor';
import Migrations from './migrations/Migrations';

Meteor.startup(() => Migrations.migrateToLatest());
