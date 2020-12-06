import { Mongo } from 'meteor/mongo';

// Pseudo-collection used to determine if we should expose first-user setup
const HasUsers = new Mongo.Collection('hasUsers');

export default HasUsers;
