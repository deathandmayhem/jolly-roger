import { Meteor } from 'meteor/meteor';
import SubscribersSchema from '../schemas/subscribers.js';

const Subscribers = new class extends Meteor.Collection {
  constructor() {
    super('jr_subscribers');
  }
}();
Subscribers.attachSchema(SubscribersSchema);

export default Subscribers;
