import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { postSlackMessage } from '/imports/server/slack.js';

Meteor.methods({
  sendChatMessage(puzzleId, message) {
    check(this.userId, String);
    check(puzzleId, String);
    check(message, String);

    /* TODO: implement Slack bridging
    let slackInfo = {
      // TODO: look up slack userId from this.userId's Profile, if available.
      userId:
      // TODO: look up Slack channelId from this puzzleId's ChatMetadata, if available.
      channelId:
      direction: 'sent-to-slack',
      state: 'sending'
    };
    */

    Models.ChatMessages.insert({
      puzzleId,
      text: message,
      sender: this.userId,
      timestamp: new Date(),
      /* TODO: implement Slack bridge
      slackInfo: {
      },
      */
    });

    // TODO: Fire off a request to Slack to post this message there, too.
    // If we have a Slack API key for this user, use that - otherwise,
    // send as the globally-configured jolly-roger/deathfromdata bot.
    this.unblock();

    const puzzle = Models.Puzzles.findOne(puzzleId);
    const hunt = Models.Hunts.findOne(puzzle.hunt);

    if (hunt.firehoseSlackChannel) {
      const profile = Models.Profiles.findOne(this.userId);
      let username = null;
      if (profile && profile.slackHandle) {
        username = profile.slackHandle;
      } else if (profile && profile.displayName) {
        username = profile.displayName;
      } else {
        username = this.userId;
      }

      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzleId}`);
      let title = puzzle.title;
      if (title.length > 25) {
        title = `${title.substring(0, 24)}…`;
      }

      const slackMessage = message.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;');
      const slackText = `[<${url}|${title}>] ${slackMessage}`;

      postSlackMessage(slackText, hunt.firehoseSlackChannel, username);
    }
  },
});
