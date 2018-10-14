import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import app from '/imports/server/api.js';

WebApp.connectHandlers.use('/api', Meteor.bindEnvironment(app));
