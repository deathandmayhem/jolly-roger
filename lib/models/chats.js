import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Match, check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.ChatMetadata = new SimpleSchema([
  Schemas.Base,
  {
    _id: {
      // Matches the Puzzle's _id.
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    slackChannel: {
      // The Slack channel ID that we want to bridge this puzzle's chat to.
      type: String,
    },
    slackChannelState: {
      // Tracks the state of this channel referenced, so we don't try to send
      // messages to archived or deleted channels.
      type: String,
      allowedValues: ['unjoined', 'active', 'archived', 'deleted'],
    },
  },
]);

Models.ChatMetadata = new Models.Base('chatmetadata');
Models.ChatMetadata.attachSchema(Schemas.ChatMetadata);

Schemas.SlackMessageInfo = new SimpleSchema({
  userId: {
    type: String,
  },
  channelId: {
    type: String,
  },
  direction: {
    // Indicates which direction this message originates from - did we initially send it to slack,
    // or did we learn about it from slack?
    type: String,
    allowedValues: ['sent-to-slack', 'received-from-slack'],
  },
  state: {
    // If 'sending', we've sent or are sending the request to Slack to post this message.
    // If 'acknowledged', Slack has acknowledged the message and hopefully given us a message ID.
    type: String,
    allowedValues: ['sending', 'acknowledged', 'failed'],
  },
  timestamp: {
    // Only present if state === 'acknowledged'.
    // Slack's timestamps look like "1451774094.000005" - to the left of the . is a UNIX timestamp;
    // to the right is an incrementing sequence number.
    type: String,
    optional: true,
  },
});

// A single chat message
Schemas.ChatMessages = new SimpleSchema([

  // Note that we don't inherit from Schemas.Base because we don't care about supporting message
  // deletion, and we need to be able to create records for chat messages from external sources that
  // were not created by any particular member of Meteor.users.
  {
    puzzleId: {
      // The puzzle to which this chat was sent.
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    text: {
      // The message body.  Plain text.
      type: String,
    },
    sender: {
      // Optional.  If present: userId of the user who sent this message.
      // This may be omitted for messages that come from an external source,
      // e.g. slack bots that do not have Jolly Roger accounts.
      type: String,
      optional: true,
      regEx: SimpleSchema.RegEx.Id,
    },
    timestamp: {
      // The date this message was sent.  Used for ordering chats in the log.
      type: Date,
    },
    slackInfo: {
      // Information about the external service this message is bridged to.
      type: Schemas.SlackMessageInfo,
      optional: true,
    },
  },
]);

class ChatMessages extends Mongo.Collection {
  // Some basic helpers are copied from Models.Base, but not all of them,
  // since we need to be able to receive chat messages from Slack with no
  // attached userId.
  constructor(options = {}) {
    super('jr_chatmessages', options);

    if (Meteor.isServer) {
      const _this = this;
      Meteor.publish('mongo.chatmessages', function (q = {}) {
        check(q, Match.Optional(Object));
        if (this.userId) {
          return _this.find(q);
        } else {
          return [];
        }
      });
    }

    this.attachRoles('mongo.chatmessages');
  }

  [Models.formatQuery](selector) {
    if (typeof selector === 'string' || selector instanceof Mongo.ObjectID) {
      return { _id: selector };
    } else {
      return selector;
    }
  }

  find(selector = {}, options = {}) {
    return super.find(this[Models.formatQuery](selector), options);
  }

  findOne(selector = {}, options = {}) {
    return super.find(this[Models.formatQuery](selector), options);
  }
}
Models.ChatMessages = new ChatMessages();
Models.ChatMessages.attachSchema(Schemas.ChatMessages);
