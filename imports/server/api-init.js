import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import app from './api.js';

WebApp.connectHandlers.use('/api', Meteor.bindEnvironment(app));
